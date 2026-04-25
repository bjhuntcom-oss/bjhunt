import type { AppVariables } from "../types.js";
/**
 * Engagement routes — CRUD + launch agent + status tracking.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { withOrg } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { requirePlan, enforceScanQuota } from "../middleware/plan-gate.js";
import { langgraphClient } from "../lib/langgraph-client.js";
import { config } from "../config.js";
import type { AuthUser } from "../middleware/auth.js";

export const engagementRoutes = new Hono<{ Variables: AppVariables }>();

engagementRoutes.use("*", requireAuth);
engagementRoutes.use("*", rateLimit(config.rateLimit.api));

// ── RoE/scope check (ENG-P0-2) ───────────────────────────────────────────
// Minimal scope validator: refuses launch if `target` matches any pattern
// in `outOfScope`. Patterns may use `*` as a glob wildcard. Exact matches
// and case-insensitive comparisons are sufficient for the immediate ATO/RoE
// risk; CIDR/IP-range parsing is a TODO for the full validator.
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .trim()
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function isTargetOutOfScope(target: string, outOfScopeStr: string | undefined | null): string | null {
  if (!outOfScopeStr) return null;
  const t = target.trim().toLowerCase();
  if (!t) return null;
  const patterns = outOfScopeStr
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const p of patterns) {
    try {
      if (patternToRegex(p).test(t)) return p;
    } catch {
      // bad regex — skip the entry
    }
  }
  return null;
}

// ── Schemas ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  target: z.string().min(1).max(500),
  targetType: z.enum(["web", "network", "cloud", "ad", "mobile", "contract"]).optional(),
  inScope: z.string().max(5000).optional(),
  outOfScope: z.string().max(5000).optional(),
  agentGraph: z.string().max(50).default("bjhunt"),
  vaccineMode: z.boolean().optional(),
  autoReport: z.boolean().optional(),
  maxDuration: z.number().int().min(1800).max(28800).optional(),
  config: z.record(z.unknown()).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  target: z.string().min(1).max(500).optional(),
  status: z
    .enum(["draft", "planning", "approved", "running", "paused", "completed", "cancelled"])
    .optional(),
  agentGraph: z.string().max(50).optional(),
  roe: z.record(z.unknown()).optional(),
  opplan: z.record(z.unknown()).optional(),
  config: z.record(z.unknown()).optional(),
});

// ── List engagements ─────────────────────────────────────────────────────

engagementRoutes.get("/", async (c) => {
  const orgId = c.get("orgId") as string;
  const status = c.req.query("status");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const engagements = await withOrg(orgId, async (tx) => {
    if (status) {
      return tx`
        SELECT id, name, description, target, status, agent_graph,
               started_at, completed_at, created_at, updated_at
        FROM engagements
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }
    return tx`
      SELECT id, name, description, target, status, agent_graph,
             started_at, completed_at, created_at, updated_at
      FROM engagements
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  });

  return c.json({ engagements });
});

// ── Get single engagement ────────────────────────────────────────────────

engagementRoutes.get("/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT * FROM engagements WHERE id = ${id}`,
  );

  if (!engagement) return c.json({ error: "Engagement not found" }, 404);
  return c.json({ engagement });
});

// ── Get engagement OPPLAN (objectives) ──────────────────────────────────

engagementRoutes.get("/:id/opplan", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id, name, status, opplan, config, agent_graph FROM engagements WHERE id = ${id}`,
  );

  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  // If opplan JSON exists and contains objectives, return them directly
  const opplanData = engagement.opplan as Record<string, unknown> | null;
  if (opplanData && Array.isArray(opplanData.objectives) && opplanData.objectives.length > 0) {
    return c.json({ objectives: opplanData.objectives });
  }

  // Otherwise, generate mock objectives based on engagement status and config
  const targetType = (engagement.config as Record<string, unknown>)?.targetType as string | undefined;
  const objectives = generateDefaultObjectives(engagement.status as string, targetType);

  return c.json({ objectives });
});

// ── Append an objective to engagement OPPLAN ────────────────────────────
// Backs the CVE "Create Exploit Objective" CTA and the audits/[id]/graph
// "Generate OPPLAN" button (DOC-07 dead handlers).
//
// Body schema mirrors the Decepticon Pydantic `Objective` model, but every
// field except `title` is optional — the backend fills sane defaults so the
// frontend can post a minimal CVE-derived blob.
const appendObjectiveSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  phase: z
    .enum(["recon", "exploit", "post_exploit", "exfiltration", "report"])
    .default("exploit"),
  priority: z.number().int().min(1).max(5).default(3),
  mitre: z.array(z.string().max(20)).max(20).optional(),
  opsec: z.enum(["low", "medium", "high", "very_high", "burn_after_use"]).default("medium"),
  c2_tier: z.enum(["t0", "t1", "t2"]).default("t1"),
  acceptance_criteria: z.string().max(2000).optional(),
  parent_id: z.string().uuid().optional(),
  source: z
    .object({
      kind: z.enum(["cve", "finding", "graph_chain", "manual"]),
      ref: z.string().max(200),
    })
    .optional(),
});

engagementRoutes.post(
  "/:id/objectives",
  zValidator("json", appendObjectiveSchema),
  async (c) => {
    const orgId = c.get("orgId") as string;
    const user = c.get("user") as AuthUser;
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const [engagement] = await withOrg(orgId, (tx) =>
      tx`SELECT id, name, status, opplan FROM engagements WHERE id = ${id}`,
    );
    if (!engagement) return c.json({ error: "Engagement not found" }, 404);

    const objective = {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description ?? null,
      phase: body.phase,
      priority: body.priority,
      status: "draft" as const,
      mitre: body.mitre ?? [],
      opsec: body.opsec,
      opsec_notes: null,
      c2_tier: body.c2_tier,
      concessions: [] as string[],
      blocked_by: [] as string[],
      acceptance_criteria: body.acceptance_criteria ?? null,
      parent_id: body.parent_id ?? null,
      owner: user.id,
      source: body.source ?? null,
      created_at: new Date().toISOString(),
      created_by: user.id,
    };

    const current = (engagement.opplan as Record<string, unknown> | null) ?? {};
    const objectives = Array.isArray(current.objectives)
      ? [...(current.objectives as unknown[])]
      : [];
    objectives.push(objective);
    const nextOpplan = { ...current, objectives, updated_at: new Date().toISOString() };

    await withOrg(orgId, (tx) =>
      tx`UPDATE engagements
         SET opplan = ${JSON.stringify(nextOpplan)}::jsonb,
             updated_at = now()
         WHERE id = ${id}`,
    );

    await withOrg(orgId, (tx) =>
      tx`INSERT INTO audit_logs (org_id, user_id, action, resource, details)
         VALUES (${orgId}, ${user.id}, 'engagement.objective.create',
                 ${"engagement:" + id},
                 ${JSON.stringify({ objectiveId: objective.id, source: body.source ?? null, phase: objective.phase })})`,
    ).catch(() => {});

    return c.json({ objective }, 201);
  },
);

/**
 * Generate default OPPLAN objectives based on engagement status and target type.
 * These serve as a template until the agent produces a real OPPLAN.
 */
function generateDefaultObjectives(
  status: string,
  targetType?: string,
): Array<Record<string, unknown>> {
  const phases = [
    {
      phase: "reconnaissance",
      title: "Target Reconnaissance",
      description: "Enumerate subdomains, open ports, and running services on the target.",
      agent: "Recon",
      mitre: ["T1595", "T1592"],
      timeEstimate: "15-30 min",
    },
    {
      phase: "initial_access",
      title: "Initial Access Vectors",
      description: "Identify and attempt initial access through exposed services and web applications.",
      agent: "Exploit",
      mitre: ["T1190", "T1133"],
      timeEstimate: "30-60 min",
    },
    {
      phase: "execution",
      title: "Payload Execution",
      description: "Execute payloads on compromised systems to establish a foothold.",
      agent: "Exploit",
      mitre: ["T1059", "T1203"],
      timeEstimate: "15-30 min",
    },
    {
      phase: "privilege_escalation",
      title: "Privilege Escalation",
      description: "Escalate privileges from initial foothold to higher-privileged accounts.",
      agent: "PostExploit",
      mitre: ["T1068", "T1548"],
      timeEstimate: "30-45 min",
    },
    {
      phase: "credential_access",
      title: "Credential Harvesting",
      description: "Extract and crack credentials from compromised systems.",
      agent: "PostExploit",
      mitre: ["T1003", "T1552"],
      timeEstimate: "20-40 min",
    },
    {
      phase: "lateral_movement",
      title: "Lateral Movement",
      description: "Move laterally across the network using harvested credentials.",
      agent: "PostExploit",
      mitre: ["T1021", "T1570"],
      timeEstimate: "30-60 min",
    },
    {
      phase: "defense_evasion",
      title: "Defense Evasion Analysis",
      description: "Assess detection gaps and evasion opportunities in the target environment.",
      agent: "Analyst",
      mitre: ["T1562", "T1070"],
      timeEstimate: "15-30 min",
    },
    {
      phase: "collection",
      title: "Data Collection & Exfiltration",
      description: "Identify sensitive data and test exfiltration paths.",
      agent: "PostExploit",
      mitre: ["T1005", "T1041"],
      timeEstimate: "15-20 min",
    },
  ];

  // Add AD-specific objectives
  if (targetType === "ad") {
    phases.push(
      {
        phase: "credential_access",
        title: "Kerberoasting & AS-REP Roast",
        description: "Extract service account hashes via Kerberoasting and AS-REP roasting.",
        agent: "AD Operator",
        mitre: ["T1558.003", "T1558.004"],
        timeEstimate: "20-30 min",
      },
      {
        phase: "lateral_movement",
        title: "BloodHound Path Analysis",
        description: "Map AD attack paths using BloodHound for privilege escalation routes.",
        agent: "AD Operator",
        mitre: ["T1087", "T1069"],
        timeEstimate: "15-25 min",
      },
    );
  }

  // Add cloud-specific objectives
  if (targetType === "cloud") {
    phases.push(
      {
        phase: "privilege_escalation",
        title: "Cloud IAM Privilege Escalation",
        description: "Enumerate and exploit IAM misconfigurations for privilege escalation.",
        agent: "Cloud Hunter",
        mitre: ["T1078", "T1098"],
        timeEstimate: "20-40 min",
      },
      {
        phase: "collection",
        title: "Storage & Secrets Enumeration",
        description: "Scan for exposed S3 buckets, secrets in Terraform state, and K8s RBAC issues.",
        agent: "Cloud Hunter",
        mitre: ["T1530", "T1552.001"],
        timeEstimate: "15-30 min",
      },
    );
  }

  // Add contract-specific objectives
  if (targetType === "contract") {
    phases.push(
      {
        phase: "execution",
        title: "Smart Contract Vulnerability Scan",
        description: "Run Slither analysis and check for reentrancy, flash loan, and access control issues.",
        agent: "Contract Auditor",
        mitre: ["T1195"],
        timeEstimate: "30-60 min",
      },
    );
  }

  // Assign statuses based on engagement status
  return phases.map((p, i) => {
    let objStatus: string;
    if (status === "completed") {
      objStatus = "passed";
    } else if (status === "running") {
      if (i === 0) objStatus = "passed";
      else if (i === 1) objStatus = "in_progress";
      else objStatus = "pending";
    } else if (status === "cancelled") {
      if (i === 0) objStatus = "passed";
      else objStatus = "blocked";
    } else {
      objStatus = "pending";
    }

    return {
      id: `obj-${i}-${p.phase}`,
      title: p.title,
      description: p.description,
      phase: p.phase,
      status: objStatus,
      agent: p.agent,
      mitre: p.mitre,
      timeEstimate: p.timeEstimate,
    };
  });
}

// ── Create engagement ────────────────────────────────────────────────────

// Plan gating is delegated to enforceScanQuota — it reads canCreateEngagements
// + scansPerMonth from PLAN_LIMITS, which is the same source of truth used by
// the dashboard usage panel. Free users get a single demo engagement so the
// 5-min chat demo promised on /pricing actually works (capped further by
// enforceDemoLimit on /api/chat/prepare).
engagementRoutes.post("/", enforceScanQuota(), zValidator("json", createSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const body = c.req.valid("json");

  // Merge wizard fields into config JSON
  const engConfig = {
    ...(body.config || {}),
    ...(body.targetType ? { targetType: body.targetType } : {}),
    ...(body.inScope ? { inScope: body.inScope } : {}),
    ...(body.outOfScope ? { outOfScope: body.outOfScope } : {}),
    ...(body.vaccineMode !== undefined ? { vaccineMode: body.vaccineMode } : {}),
    ...(body.autoReport !== undefined ? { autoReport: body.autoReport } : {}),
    ...(body.maxDuration ? { maxDuration: body.maxDuration } : {}),
  };

  const [engagement] = await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO engagements (org_id, created_by, name, description, target, agent_graph, config)
      VALUES (${orgId}, ${user.id}, ${body.name}, ${body.description || null},
              ${body.target}, ${body.agentGraph}, ${JSON.stringify(engConfig)})
      RETURNING *
    `,
  );

  await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO audit_logs (org_id, user_id, action, resource)
      VALUES (${orgId}, ${user.id}, 'engagement.create', ${"engagement:" + engagement!.id})
    `,
  );

  return c.json({ engagement }, 201);
});

// ── Update engagement ────────────────────────────────────────────────────

// ENG-P1-2: state machine for engagement.status. Allowed transitions only.
// Terminal states (completed, failed, cancelled) cannot move back to a
// running/draft state — that would orphan agent_runs that already finished.
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft:     ["approved", "running", "cancelled"],
  approved:  ["running", "draft", "cancelled"],
  running:   ["completed", "failed", "cancelled"],
  completed: [],
  failed:    [],
  cancelled: [],
};

engagementRoutes.patch("/:id", zValidator("json", updateSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const setClauses: string[] = [];
  const values: Record<string, unknown> = {};

  if (body.name !== undefined) values.name = body.name;
  if (body.description !== undefined) values.description = body.description;
  if (body.target !== undefined) values.target = body.target;
  if (body.status !== undefined) {
    // Validate the transition against the current status.
    const [current] = await withOrg(orgId, (tx) =>
      tx`SELECT status FROM engagements WHERE id = ${id}`,
    );
    if (!current) return c.json({ error: "Engagement not found" }, 404);
    const from = current.status as string;
    const to = body.status as string;
    if (from !== to) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[from] ?? [];
      if (!allowed.includes(to)) {
        return c.json(
          {
            error: `Status transition ${from} → ${to} is not allowed`,
            allowedTransitions: allowed,
          },
          422,
        );
      }
    }
    values.status = body.status;
  }
  if (body.agentGraph !== undefined) values.agentGraph = body.agentGraph;
  if (body.roe !== undefined) values.roe = JSON.stringify(body.roe);
  if (body.opplan !== undefined) values.opplan = JSON.stringify(body.opplan);
  if (body.config !== undefined) values.config = JSON.stringify(body.config);

  if (Object.keys(values).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  // Add timestamps for status transitions
  if (body.status === "running") values.startedAt = new Date();
  if (body.status === "completed" || body.status === "cancelled")
    values.completedAt = new Date();

  const [updated] = await withOrg(orgId, (tx) =>
    tx`
      UPDATE engagements SET ${tx(values as any)}
      WHERE id = ${id}
      RETURNING *
    `,
  );

  if (!updated) return c.json({ error: "Engagement not found" }, 404);

  await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO audit_logs (org_id, user_id, action, resource, details)
      VALUES (${orgId}, ${user.id}, 'engagement.update',
              ${"engagement:" + id}, ${JSON.stringify({ fields: Object.keys(values) })})
    `,
  );

  return c.json({ engagement: updated });
});

// ── Launch engagement (start agent) ──────────────────────────────────────

engagementRoutes.post("/:id/launch", requirePlan("pro", "enterprise"), enforceScanQuota(), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");

  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT * FROM engagements WHERE id = ${id}`,
  );

  if (!engagement) return c.json({ error: "Engagement not found" }, 404);
  if (engagement.status !== "approved" && engagement.status !== "draft") {
    return c.json({ error: `Cannot launch from status: ${engagement.status}` }, 400);
  }

  // ENG-P0-2: enforce out-of-scope. Refuse to launch if the target matches
  // any user-declared out-of-scope pattern. Stops trivial RoE violations.
  const cfg = (engagement.config ?? {}) as Record<string, unknown>;
  const oos = typeof cfg.outOfScope === "string" ? cfg.outOfScope : null;
  const matched = isTargetOutOfScope(engagement.target as string, oos);
  if (matched) {
    return c.json(
      {
        error: "Target is out of scope per the engagement's RoE",
        target: engagement.target,
        matchedPattern: matched,
      },
      422,
    );
  }

  // Create a LangGraph thread and start the agent
  const thread = await langgraphClient.createThread();

  // Update engagement with thread ID and status
  await withOrg(orgId, (tx) =>
    tx`
      UPDATE engagements
      SET status = 'running', langgraph_thread_id = ${thread.threadId}, started_at = now()
      WHERE id = ${id}
    `,
  );

  // Start the agent run asynchronously
  await langgraphClient.createRun(thread.threadId, engagement.agentGraph as string, {
    target: engagement.target,
    engagement_id: id,
    org_id: orgId,
    roe: engagement.roe,
    opplan: engagement.opplan,
  });

  await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO audit_logs (org_id, user_id, action, resource, details)
      VALUES (${orgId}, ${user.id}, 'engagement.launch',
              ${"engagement:" + id}, ${JSON.stringify({ threadId: thread.threadId })})
    `,
  );

  return c.json({ status: "running", threadId: thread.threadId });
});

// ── Get engagement findings ──────────────────────────────────────────────

engagementRoutes.get("/:id/findings", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  const findings = await withOrg(orgId, (tx) =>
    tx`
      SELECT * FROM findings
      WHERE engagement_id = ${id}
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          WHEN 'info' THEN 4
        END,
        created_at DESC
    `,
  );

  return c.json({ findings });
});

// ── Create finding for engagement ────────────────────────────────────────

const createFindingSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  cvssScore: z.number().min(0).max(10).optional(),
  cvssVector: z.string().max(200).optional(),
  cveIds: z.array(z.string().max(20)).optional(),
  mitreAttack: z.array(z.string().max(20)).optional(),
  evidence: z.record(z.unknown()).optional(),
  remediation: z.string().max(5000).optional(),
});

engagementRoutes.post("/:id/findings", zValidator("json", createFindingSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");
  const body = c.req.valid("json");

  // Verify engagement exists in this org
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id FROM engagements WHERE id = ${id}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  const [finding] = await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO findings (org_id, engagement_id, title, description, severity,
                            cvss_score, cvss_vector, cve_ids, mitre_attack, evidence, remediation)
      VALUES (${orgId}, ${id}, ${body.title}, ${body.description || null},
              ${body.severity}, ${body.cvssScore ?? null}, ${body.cvssVector || null},
              ${body.cveIds || null}, ${body.mitreAttack || null},
              ${body.evidence ? JSON.stringify(body.evidence) : null},
              ${body.remediation || null})
      RETURNING *
    `,
  );

  await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO audit_logs (org_id, user_id, action, resource)
      VALUES (${orgId}, ${user.id}, 'finding.create', ${"finding:" + finding!.id})
    `,
  );

  return c.json({ finding }, 201);
});

// ── Get knowledge graph for engagement ──────────────────────────────────

engagementRoutes.get("/:id/graph", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  // Verify engagement exists
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id, name, target, status, config FROM engagements WHERE id = ${id}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  // Fetch findings for this engagement
  const findings = await withOrg(orgId, (tx) =>
    tx`SELECT id, title, description, severity, cvss_score, cvss_vector,
              cve_ids, mitre_attack, evidence, remediation, status, created_at
       FROM findings
       WHERE engagement_id = ${id}
       ORDER BY
         CASE severity
           WHEN 'critical' THEN 0
           WHEN 'high' THEN 1
           WHEN 'medium' THEN 2
           WHEN 'low' THEN 3
           WHEN 'info' THEN 4
         END,
         created_at DESC`,
  );

  // Build graph nodes
  const nodes: Array<{
    id: string;
    type: string;
    label: string;
    properties: Record<string, any>;
  }> = [];
  const edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
  }> = [];

  // Create a HOST node from the engagement target
  const hostId = `host-${id}`;
  const target = engagement.target as string;
  nodes.push({
    id: hostId,
    type: "host",
    label: target,
    properties: {
      target,
      status: engagement.status as string,
      servicesCount: 0,
    },
  });

  // Track severity counts
  let criticalFindings = 0;
  let highFindings = 0;

  // Create FINDING nodes and HOST -> AFFECTS -> FINDING edges
  for (const f of findings) {
    const fId = `finding-${f.id}`;
    const severity = f.severity as string;

    if (severity === "critical") criticalFindings++;
    if (severity === "high") highFindings++;

    const props: Record<string, any> = {
      severity,
      status: f.status as string,
    };

    if (f.cvss_score != null) props.cvssScore = f.cvss_score;
    if (f.cvss_vector) props.cvssVector = f.cvss_vector;
    if (f.cve_ids && (f.cve_ids as string[]).length > 0)
      props.cveIds = (f.cve_ids as string[]).join(", ");
    if (f.mitre_attack && (f.mitre_attack as string[]).length > 0)
      props.mitreAttack = (f.mitre_attack as string[]).join(", ");
    if (f.remediation) props.remediation = f.remediation;
    if (f.description) props.description = (f.description as string).slice(0, 200);

    nodes.push({
      id: fId,
      type: "finding",
      label: f.title as string,
      properties: props,
    });

    edges.push({
      id: `edge-affects-${f.id}`,
      source: hostId,
      target: fId,
      type: "AFFECTS",
    });
  }

  // Build chains: group critical/high findings into attack chains
  // Each chain: HOST -> AFFECTS -> FINDING
  // If multiple critical/high findings exist, chain them with ESCALATES_TO
  const chains: Array<{
    id: string;
    severity: string;
    nodes: string[];
  }> = [];

  const criticalHighFindings = findings.filter(
    (f: any) => f.severity === "critical" || f.severity === "high",
  );

  if (criticalHighFindings.length > 0) {
    // Build a single primary attack chain with all critical/high findings
    const chainNodes = [hostId];
    let highestSeverity = "high";

    for (const f of criticalHighFindings) {
      const fId = `finding-${f.id}`;
      chainNodes.push(fId);
      if ((f.severity as string) === "critical") highestSeverity = "critical";
    }

    // Add ESCALATES_TO edges between sequential findings in the chain
    for (let i = 1; i < criticalHighFindings.length; i++) {
      const prevId = `finding-${criticalHighFindings[i - 1]!.id}`;
      const currId = `finding-${criticalHighFindings[i]!.id}`;
      const edgeId = `edge-escalates-${i}`;

      // Only add if not already present
      if (!edges.some((e) => e.id === edgeId)) {
        edges.push({
          id: edgeId,
          source: prevId,
          target: currId,
          type: "ESCALATES_TO",
        });
      }
    }

    chains.push({
      id: "chain-1",
      severity: highestSeverity,
      nodes: chainNodes,
    });
  }

  // Also create individual chains for each critical finding
  const criticalOnly = findings.filter((f: any) => f.severity === "critical");
  criticalOnly.forEach((f: any, idx: number) => {
    chains.push({
      id: `chain-crit-${idx + 1}`,
      severity: "critical",
      nodes: [hostId, `finding-${f.id}`],
    });
  });

  const stats = {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    criticalFindings,
    highFindings,
  };

  return c.json({ nodes, edges, stats, chains });
});

// ── Graph ingest — import scan data (nmap, nuclei, sarif, bloodhound, testssl) ──

engagementRoutes.post("/:id/graph/ingest", requirePlan("pro", "enterprise"), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");

  // Verify engagement exists
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id, target FROM engagements WHERE id = ${id}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  const content = await file.text();
  const fileName = file.name.toLowerCase();
  let nodesAdded = 0;
  let edgesAdded = 0;

  // Auto-detect format and parse
  try {
    if (fileName.endsWith(".xml") || content.trimStart().startsWith("<?xml")) {
      // ── nmap XML ──
      const hostMatches = content.matchAll(/<host[\s>][\s\S]*?<\/host>/gi);
      for (const hostMatch of hostMatches) {
        const hostBlock = hostMatch[0];
        const addrMatch = hostBlock.match(/addr="([^"]+)"/);
        const addr = addrMatch ? addrMatch[1] : null;
        if (!addr) continue;

        // Create a finding for the host
        await withOrg(orgId, (tx) =>
          tx`INSERT INTO findings (org_id, engagement_id, title, severity, evidence)
             VALUES (${orgId}, ${id}, ${"Host discovered: " + addr}, 'info',
                     ${JSON.stringify({ source: "nmap", ip: addr })})
             ON CONFLICT DO NOTHING`,
        );
        nodesAdded++;

        // Extract ports/services
        const portMatches = hostBlock.matchAll(
          /<port protocol="([^"]*)" portid="(\d+)"[\s\S]*?<state state="([^"]*)"[\s\S]*?(?:<service name="([^"]*)")?/gi,
        );
        for (const pm of portMatches) {
          const protocol = pm[1] || "tcp";
          const port = pm[2];
          const state = pm[3];
          const service = pm[4] || "unknown";
          if (state !== "open") continue;

          await withOrg(orgId, (tx) =>
            tx`INSERT INTO findings (org_id, engagement_id, title, severity, evidence)
               VALUES (${orgId}, ${id},
                       ${"Service: " + service + " on " + addr + ":" + port + "/" + protocol},
                       'info',
                       ${JSON.stringify({ source: "nmap", ip: addr, port: Number(port), protocol, service })})
               ON CONFLICT DO NOTHING`,
          );
          nodesAdded++;
          edgesAdded++; // host -> service edge
        }
      }
    } else if (fileName.endsWith(".jsonl") || (content.trimStart().startsWith("{") && content.includes('"template-id"'))) {
      // ── nuclei JSONL ──
      const lines = content.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const templateId = entry["template-id"] || entry.templateID || entry.info?.name || "unknown";
          const sev = (entry.info?.severity || entry.severity || "info").toLowerCase();
          const matched = entry["matched-at"] || entry.matched || entry.host || "";
          const desc = entry.info?.description || entry.info?.name || templateId;

          const validSev = ["critical", "high", "medium", "low", "info"].includes(sev) ? sev : "info";

          await withOrg(orgId, (tx) =>
            tx`INSERT INTO findings (org_id, engagement_id, title, description, severity, evidence)
               VALUES (${orgId}, ${id},
                       ${templateId + " — " + matched},
                       ${typeof desc === "string" ? desc.slice(0, 2000) : String(desc).slice(0, 2000)},
                       ${validSev},
                       ${JSON.stringify({ source: "nuclei", templateId, matched, raw: entry.info })})
               ON CONFLICT DO NOTHING`,
          );
          nodesAdded++;
          edgesAdded++;
        } catch {
          // skip malformed lines
        }
      }
    } else if (content.includes('"$schema"') && content.includes("sarif") || fileName.endsWith(".sarif")) {
      // ── SARIF ──
      const sarif = JSON.parse(content);
      const runs = sarif.runs || [];
      for (const run of runs) {
        const results = run.results || [];
        for (const result of results) {
          const ruleId = result.ruleId || "unknown";
          const msg = result.message?.text || result.message?.markdown || "";
          const location = result.locations?.[0]?.physicalLocation?.artifactLocation?.uri || "";
          const level = result.level || "warning";

          let severity = "medium";
          if (level === "error") severity = "high";
          else if (level === "note") severity = "low";
          else if (level === "none") severity = "info";

          await withOrg(orgId, (tx) =>
            tx`INSERT INTO findings (org_id, engagement_id, title, description, severity, evidence)
               VALUES (${orgId}, ${id},
                       ${ruleId + (location ? " @ " + location : "")},
                       ${typeof msg === "string" ? msg.slice(0, 2000) : ""},
                       ${severity},
                       ${JSON.stringify({ source: "sarif", ruleId, location, level })})
               ON CONFLICT DO NOTHING`,
          );
          nodesAdded++;
          edgesAdded++;
        }
      }
    } else if (fileName.includes("bloodhound") || fileName.endsWith(".zip")) {
      // ── BloodHound JSON (simplified — accepts single JSON files) ──
      try {
        const bh = JSON.parse(content);
        const data = bh.data || bh.computers || bh.users || bh.groups || [];
        const items = Array.isArray(data) ? data : [];
        for (const item of items.slice(0, 500)) {
          const name = item.Properties?.name || item.name || item.ObjectIdentifier || "unknown";
          const type = item.Properties?.objecttype || item.type || "host";

          await withOrg(orgId, (tx) =>
            tx`INSERT INTO findings (org_id, engagement_id, title, severity, evidence)
               VALUES (${orgId}, ${id},
                       ${"BloodHound: " + name},
                       'info',
                       ${JSON.stringify({ source: "bloodhound", type, name })})
               ON CONFLICT DO NOTHING`,
          );
          nodesAdded++;
        }
      } catch {
        return c.json({ error: "Invalid BloodHound JSON format" }, 400);
      }
    } else if (fileName.includes("testssl") || content.includes('"severity"') && content.includes('"id"')) {
      // ── testssl JSON ──
      try {
        const data = JSON.parse(content);
        const findings = Array.isArray(data) ? data : data.scanResult || data.findings || [];
        for (const f of findings) {
          const fid = f.id || "unknown";
          const severity = (f.severity || "info").toLowerCase().replace("warn", "medium");
          const finding = f.finding || f.message || "";

          const validSev = ["critical", "high", "medium", "low", "info"].includes(severity) ? severity : "info";

          await withOrg(orgId, (tx) =>
            tx`INSERT INTO findings (org_id, engagement_id, title, description, severity, evidence)
               VALUES (${orgId}, ${id},
                       ${"TLS: " + fid},
                       ${typeof finding === "string" ? finding.slice(0, 2000) : ""},
                       ${validSev},
                       ${JSON.stringify({ source: "testssl", id: fid })})
               ON CONFLICT DO NOTHING`,
          );
          nodesAdded++;
        }
      } catch {
        return c.json({ error: "Invalid testssl JSON format" }, 400);
      }
    } else {
      return c.json({ error: "Unsupported file format. Supported: nmap XML, nuclei JSONL, SARIF, BloodHound JSON, testssl JSON" }, 400);
    }
  } catch (err: any) {
    return c.json({ error: "Parse error: " + (err?.message || "unknown") }, 400);
  }

  await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO audit_logs (org_id, user_id, action, resource, details)
      VALUES (${orgId}, ${user.id}, 'graph.ingest',
              ${"engagement:" + id},
              ${JSON.stringify({ fileName: file.name, nodesAdded, edgesAdded })})
    `,
  ).catch(() => {});

  return c.json({ nodesAdded, edgesAdded });
});

// ── Graph chains — build attack chains from findings ────────────────────

engagementRoutes.get("/:id/graph/chains", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  // Verify engagement exists
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id, target FROM engagements WHERE id = ${id}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  // Get findings sorted by severity for chain building
  const findings = await withOrg(orgId, (tx) =>
    tx`SELECT id, title, severity, cvss_score, mitre_attack, evidence
       FROM findings
       WHERE engagement_id = ${id}
       ORDER BY
         CASE severity
           WHEN 'critical' THEN 0
           WHEN 'high' THEN 1
           WHEN 'medium' THEN 2
           WHEN 'low' THEN 3
           WHEN 'info' THEN 4
         END,
         cvss_score DESC NULLS LAST`,
  );

  const hostId = `host-${id}`;
  const chains: Array<{
    id: string;
    severity: string;
    riskScore: number;
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      severity: string;
    }>;
  }> = [];

  // Group findings by severity tier for chain construction
  const criticals = findings.filter((f: any) => f.severity === "critical");
  const highs = findings.filter((f: any) => f.severity === "high");
  const mediums = findings.filter((f: any) => f.severity === "medium");

  // Primary chain: all critical + high findings form an escalation path
  if (criticals.length > 0 || highs.length > 0) {
    const chainFindings = [...criticals, ...highs];
    const riskScore = chainFindings.reduce(
      (sum: number, f: any) => sum + (f.cvss_score ?? (f.severity === "critical" ? 9.5 : 7.5)),
      0,
    );

    chains.push({
      id: "chain-primary",
      severity: criticals.length > 0 ? "critical" : "high",
      riskScore: Math.round((riskScore / chainFindings.length) * 10) / 10,
      nodes: [
        { id: hostId, label: engagement.target as string, type: "host", severity: "info" },
        ...chainFindings.map((f: any) => ({
          id: `finding-${f.id}`,
          label: f.title as string,
          type: "finding",
          severity: f.severity as string,
        })),
      ],
    });
  }

  // Individual critical chains
  criticals.forEach((f: any, idx: number) => {
    chains.push({
      id: `chain-crit-${idx + 1}`,
      severity: "critical",
      riskScore: f.cvss_score ?? 9.5,
      nodes: [
        { id: hostId, label: engagement.target as string, type: "host", severity: "info" },
        { id: `finding-${f.id}`, label: f.title as string, type: "finding", severity: "critical" },
      ],
    });
  });

  // Medium-severity chain if there are enough mediums to form a path
  if (mediums.length >= 3) {
    const riskScore = mediums.reduce(
      (sum: number, f: any) => sum + (f.cvss_score ?? 5.0),
      0,
    );
    chains.push({
      id: "chain-medium-agg",
      severity: "medium",
      riskScore: Math.round((riskScore / mediums.length) * 10) / 10,
      nodes: [
        { id: hostId, label: engagement.target as string, type: "host", severity: "info" },
        ...mediums.slice(0, 5).map((f: any) => ({
          id: `finding-${f.id}`,
          label: f.title as string,
          type: "finding",
          severity: "medium",
        })),
      ],
    });
  }

  // Sort chains by risk score descending
  chains.sort((a, b) => b.riskScore - a.riskScore);

  return c.json({ chains });
});

// ── Delete engagement ────────────────────────────────────────────────────

engagementRoutes.delete("/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");

  const result = await withOrg(orgId, (tx) =>
    tx`DELETE FROM engagements WHERE id = ${id}`,
  );

  if (result.count === 0) return c.json({ error: "Engagement not found" }, 404);

  await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO audit_logs (org_id, user_id, action, resource)
      VALUES (${orgId}, ${user.id}, 'engagement.delete', ${"engagement:" + id})
    `,
  );

  return c.json({ ok: true });
});

// ── Get agent runs for engagement ────────────────────────────────────────

engagementRoutes.get("/:id/runs", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  const runs = await withOrg(orgId, (tx) =>
    tx`SELECT id, agent_name, status, input_summary, output_summary, error,
              tokens_input, tokens_output, duration_ms, started_at, completed_at
       FROM agent_runs
       WHERE engagement_id = ${id}
       ORDER BY created_at DESC`,
  );

  return c.json({ runs });
});

// ── Get vaccine loop status for engagement ──────────────────────────────

engagementRoutes.get("/:id/vaccine-status", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  // Verify engagement exists
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id, status, started_at, config FROM engagements WHERE id = ${id}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  // Get findings with severity breakdown
  const findingsRows = await withOrg(orgId, (tx) =>
    tx`SELECT severity, COUNT(*)::int AS count
       FROM findings
       WHERE engagement_id = ${id}
       GROUP BY severity`,
  );

  const findings = { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const row of findingsRows) {
    const sev = row.severity as keyof typeof findings;
    if (sev in findings && sev !== "total") {
      findings[sev] = row.count;
      findings.total += row.count;
    }
  }

  // Get agent runs to reconstruct vaccine loop state
  const runs = await withOrg(orgId, (tx) =>
    tx`SELECT agent_name, status, input_summary, output_summary, error,
              started_at, completed_at
       FROM agent_runs
       WHERE engagement_id = ${id}
       ORDER BY created_at ASC`,
  );

  // Determine current phase from agent runs
  let phase: string = "idle";
  let currentAgent: string | null = null;
  let currentFinding: string | null = null;
  let defensesApplied = 0;
  let defensesVerified = 0;
  let defensesFailed = 0;
  const history: Array<{
    timestamp: string;
    phase: string;
    action: string;
    result: string;
    severity?: string;
  }> = [];

  for (const run of runs) {
    const agentName = (run.agentName || run.agent_name || "") as string;
    const runStatus = run.status as string;
    const agentLower = agentName.toLowerCase();

    if (["recon", "exploit", "analyst", "scanner", "cloud_hunter", "ad_operator"].some(a => agentLower.includes(a))) {
      if (runStatus === "running") {
        phase = "attack";
        currentAgent = agentName;
      }
      if (run.output_summary) {
        history.push({
          timestamp: (run.completed_at || run.started_at || new Date().toISOString()) as string,
          phase: "attack",
          action: (run.output_summary as string).slice(0, 120),
          result: runStatus === "error" ? "failure" : "finding",
        });
      }
    } else if (agentLower.includes("defender") || agentLower.includes("defense")) {
      if (runStatus === "running") {
        phase = "defense";
        currentAgent = agentName;
      }
      if (runStatus === "completed") {
        defensesApplied++;
        history.push({
          timestamp: (run.completed_at || run.started_at || new Date().toISOString()) as string,
          phase: "defense",
          action: (run.output_summary as string || "Defense applied").slice(0, 120),
          result: "success",
        });
      } else if (runStatus === "error") {
        history.push({
          timestamp: (run.completed_at || run.started_at || new Date().toISOString()) as string,
          phase: "defense",
          action: (run.error as string || "Defense failed").slice(0, 120),
          result: "failure",
        });
      }
    } else if (agentLower.includes("verif")) {
      if (runStatus === "running") {
        phase = "verification";
        currentAgent = agentName;
      }
      if (runStatus === "completed") {
        const output = (run.output_summary || "") as string;
        if (output.toLowerCase().includes("fail") || output.toLowerCase().includes("still vulnerable")) {
          defensesFailed++;
          history.push({
            timestamp: (run.completed_at || run.started_at || new Date().toISOString()) as string,
            phase: "verification",
            action: output.slice(0, 120),
            result: "failure",
          });
        } else {
          defensesVerified++;
          history.push({
            timestamp: (run.completed_at || run.started_at || new Date().toISOString()) as string,
            phase: "verification",
            action: output.slice(0, 120) || "Defense verified",
            result: "success",
          });
        }
      }
    } else if (agentLower.includes("brief") || agentLower.includes("soundwave")) {
      if (runStatus === "running") {
        phase = "brief_generation";
        currentAgent = agentName;
      }
      if (run.output_summary) {
        history.push({
          timestamp: (run.completed_at || run.started_at || new Date().toISOString()) as string,
          phase: "brief_generation",
          action: (run.output_summary as string).slice(0, 120),
          result: "info",
        });
      }
    }

    if (runStatus === "running" && run.input_summary) {
      currentFinding = (run.input_summary as string).slice(0, 100);
    }
  }

  if (engagement.status === "completed") {
    phase = "complete";
    currentAgent = null;
    currentFinding = null;
  }

  const attackRuns = runs.filter((r: any) => {
    const name = ((r.agentName || r.agent_name || "") as string).toLowerCase();
    return ["recon", "exploit", "analyst", "scanner"].some(a => name.includes(a));
  });
  const iteration = Math.max(1, Math.ceil(attackRuns.length / 3));
  const maxIterations = ((engagement.config as any)?.maxIterations) || 10;

  return c.json({
    phase,
    iteration: phase === "idle" ? 0 : iteration,
    maxIterations,
    findings,
    defensesApplied,
    defensesVerified,
    defensesFailed,
    currentFinding,
    currentAgent,
    startedAt: engagement.started_at ? (engagement.started_at as Date).toISOString() : null,
    history: history.slice(-20),
  });
});

// ── Get defense brief for engagement ──────────────────────────────────

engagementRoutes.get("/:id/defense-brief", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  // Verify engagement exists
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id, status FROM engagements WHERE id = ${id}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  // Get critical/high findings to generate defense recommendations
  const findings = await withOrg(orgId, (tx) =>
    tx`SELECT id, title, severity, description, remediation
       FROM findings
       WHERE engagement_id = ${id}
         AND severity IN ('critical', 'high')
       ORDER BY
         CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 END,
         created_at DESC`,
  );

  // Generate defense action recommendations from findings
  const actions = findings.map((f: Record<string, unknown>, idx: number) => {
    const severity = f.severity as string;
    const title = f.title as string;
    const titleLower = title.toLowerCase();

    // Determine action type based on finding content
    let type = "CONFIG_CHANGE";
    let target = "System configuration";

    if (titleLower.includes("port") || titleLower.includes("service") || titleLower.includes("exposed")) {
      type = "BLOCK_PORT";
      const portMatch = title.match(/\b(\d{2,5})\b/);
      target = portMatch ? `Port ${portMatch[1]}/tcp` : "Exposed service port";
    } else if (titleLower.includes("credential") || titleLower.includes("password") || titleLower.includes("auth")) {
      type = "REVOKE_CREDENTIAL";
      target = "Compromised credentials";
    } else if (titleLower.includes("firewall") || titleLower.includes("network") || titleLower.includes("access")) {
      type = "FIREWALL_RULE";
      target = "Network access policy";
    } else if (titleLower.includes("service") || titleLower.includes("daemon") || titleLower.includes("telnet")) {
      type = "DISABLE_SERVICE";
      target = "Vulnerable service";
    }

    const description = (f.remediation as string)
      || `Remediate finding: ${title}`;

    return {
      id: `da-${idx + 1}`,
      type,
      target,
      findingId: f.id as string,
      findingSeverity: severity,
      description: description.slice(0, 300),
      status: "pending",
    };
  });

  // If no findings, return mock data for demo purposes
  if (actions.length === 0) {
    const mockActions = [
      {
        id: "da-mock-1",
        type: "BLOCK_PORT",
        target: "Port 3306/tcp on 192.168.1.10",
        findingId: "mock-finding-1",
        findingSeverity: "critical",
        description: "Block external access to MySQL port to prevent SQL injection exploitation",
        status: "pending",
      },
      {
        id: "da-mock-2",
        type: "DISABLE_SERVICE",
        target: "Service: telnetd on 192.168.1.5",
        findingId: "mock-finding-2",
        findingSeverity: "high",
        description: "Disable Telnet daemon and replace with SSH for encrypted remote administration",
        status: "pending",
      },
      {
        id: "da-mock-3",
        type: "REVOKE_CREDENTIAL",
        target: "User: admin (default credentials)",
        findingId: "mock-finding-3",
        findingSeverity: "critical",
        description: "Revoke default admin credentials and enforce password policy with MFA",
        status: "approved",
        approvedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "da-mock-4",
        type: "FIREWALL_RULE",
        target: "Ingress rule: 0.0.0.0/0 -> 8080/tcp",
        findingId: "mock-finding-4",
        findingSeverity: "high",
        description: "Restrict management interface access to internal network CIDR only",
        status: "applied",
        approvedAt: new Date(Date.now() - 7200000).toISOString(),
        appliedAt: new Date(Date.now() - 3600000).toISOString(),
        verificationResult: "BLOCKED",
        verificationDetails: "External scan confirms port 8080 no longer accessible from public IPs",
      },
      {
        id: "da-mock-5",
        type: "CONFIG_CHANGE",
        target: "Apache httpd TLS configuration",
        findingId: "mock-finding-5",
        findingSeverity: "high",
        description: "Disable TLS 1.0/1.1, remove weak cipher suites, enable HSTS with preload",
        status: "pending",
      },
    ];

    return c.json({ actions: mockActions });
  }

  return c.json({ actions });
});

// ── Approve defense action ────────────────────────────────────────────

engagementRoutes.post("/:id/defense-actions/:actionId/approve", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");
  const actionId = c.req.param("actionId");

  // Verify engagement exists
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id FROM engagements WHERE id = ${id}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  // Audit log
  await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO audit_logs (org_id, user_id, action, resource, details)
      VALUES (${orgId}, ${user.id}, 'defense.approve',
              ${"engagement:" + id},
              ${JSON.stringify({ actionId })})
    `,
  ).catch(() => {});

  return c.json({ ok: true, actionId, status: "approved", approvedAt: new Date().toISOString() });
});

// ── Reject defense action ─────────────────────────────────────────────

engagementRoutes.post("/:id/defense-actions/:actionId/reject", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");
  const actionId = c.req.param("actionId");

  // Verify engagement exists
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`SELECT id FROM engagements WHERE id = ${id}`,
  );
  if (!engagement) return c.json({ error: "Engagement not found" }, 404);

  // Audit log
  await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO audit_logs (org_id, user_id, action, resource, details)
      VALUES (${orgId}, ${user.id}, 'defense.reject',
              ${"engagement:" + id},
              ${JSON.stringify({ actionId })})
    `,
  ).catch(() => {});

  return c.json({ ok: true, actionId, status: "rejected", rejectedAt: new Date().toISOString() });
});
