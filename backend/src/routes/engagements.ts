import type { AppVariables } from "../types.js";
/**
 * Engagement routes — CRUD + launch agent + status tracking.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { withOrg, sql } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { requirePlan, enforceScanQuota } from "../middleware/plan-gate.js";
import { langgraphClient } from "../lib/langgraph-client.js";
import { config } from "../config.js";
import type { AuthUser } from "../middleware/auth.js";

export const engagementRoutes = new Hono<{ Variables: AppVariables }>();

engagementRoutes.use("*", requireAuth);
engagementRoutes.use("*", rateLimit(config.rateLimit.api));

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
  status: z
    .enum(["draft", "planning", "approved", "running", "paused", "completed", "cancelled"])
    .optional(),
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

engagementRoutes.post("/", requirePlan("pro", "enterprise"), enforceScanQuota(), zValidator("json", createSchema), async (c) => {
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

  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource)
    VALUES (${orgId}, ${user.id}, 'engagement.create', ${"engagement:" + engagement!.id})
  `;

  return c.json({ engagement }, 201);
});

// ── Update engagement ────────────────────────────────────────────────────

engagementRoutes.patch("/:id", zValidator("json", updateSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const setClauses: string[] = [];
  const values: Record<string, unknown> = {};

  if (body.name !== undefined) values.name = body.name;
  if (body.description !== undefined) values.description = body.description;
  if (body.status !== undefined) values.status = body.status;
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

  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource, details)
    VALUES (${orgId}, ${user.id}, 'engagement.update',
            ${"engagement:" + id}, ${JSON.stringify({ fields: Object.keys(values) })})
  `;

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

  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource, details)
    VALUES (${orgId}, ${user.id}, 'engagement.launch',
            ${"engagement:" + id}, ${JSON.stringify({ threadId: thread.threadId })})
  `;

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

  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource)
    VALUES (${orgId}, ${user.id}, 'finding.create', ${"finding:" + finding!.id})
  `;

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

// ── Delete engagement ────────────────────────────────────────────────────

engagementRoutes.delete("/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");

  const result = await withOrg(orgId, (tx) =>
    tx`DELETE FROM engagements WHERE id = ${id}`,
  );

  if (result.count === 0) return c.json({ error: "Engagement not found" }, 404);

  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource)
    VALUES (${orgId}, ${user.id}, 'engagement.delete', ${"engagement:" + id})
  `;

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
