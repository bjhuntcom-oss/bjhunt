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
  agentGraph: z.string().default("bjhunt"),
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

// ── Create engagement ────────────────────────────────────────────────────

engagementRoutes.post("/", requirePlan("pro", "enterprise"), enforceScanQuota(), zValidator("json", createSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const body = c.req.valid("json");

  const [engagement] = await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO engagements (org_id, created_by, name, description, target, agent_graph, config)
      VALUES (${orgId}, ${user.id}, ${body.name}, ${body.description || null},
              ${body.target}, ${body.agentGraph}, ${JSON.stringify(body.config || {})})
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
