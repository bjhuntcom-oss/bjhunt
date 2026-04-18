import type { AppVariables } from "../../types.js";
/**
 * Admin routes — platform settings + audit logs.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
// Admin routes are cross-org by definition — use the BYPASSRLS pool.
// Per docs/architecture/10-MULTI-TENANCY.md §131-148.
import { adminSql as sql } from "../../db/client.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { config } from "../../config.js";

export const adminSettingsRoutes = new Hono<{ Variables: AppVariables }>();

adminSettingsRoutes.use("*", requireAuth);
adminSettingsRoutes.use("*", requireAdmin);
adminSettingsRoutes.use("*", rateLimit(config.rateLimit.api));

// ── Platform settings ────────────────────────────────────────────────────

adminSettingsRoutes.get("/", async (c) => {
  const settings = await sql`SELECT * FROM platform_settings ORDER BY key`;
  return c.json({ settings });
});

const setSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
});

adminSettingsRoutes.put("/", zValidator("json", setSettingSchema), async (c) => {
  const { key, value } = c.req.valid("json");

  await sql`
    INSERT INTO platform_settings (key, value)
    VALUES (${key}, ${JSON.stringify(value)})
    ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = now()
  `;

  return c.json({ ok: true });
});

// ── Audit logs ───────────────────────────────────────────────────────────

adminSettingsRoutes.get("/audit-logs", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 200);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const action = c.req.query("action");

  const logs = action
    ? await sql`
        SELECT al.*, u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.action = ${action}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    : await sql`
        SELECT al.*, u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

  return c.json({ logs });
});

// ── Agent runs stats ────────────────────────────────────────────────────

adminSettingsRoutes.get("/agent-runs", async (c) => {
  const [stats] = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COUNT(*) FILTER (WHERE status = 'running')::int AS running,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COALESCE(SUM(tokens_input), 0)::bigint AS total_tokens_input,
      COALESCE(SUM(tokens_output), 0)::bigint AS total_tokens_output,
      COALESCE(SUM(tokens_input) + SUM(tokens_output), 0)::bigint AS total_tokens
    FROM agent_runs
  `;

  const s = stats as any;
  return c.json({
    total: s.total,
    completed: s.completed,
    failed: s.failed,
    running: s.running,
    pending: s.pending,
    tokens: {
      input: Number(s.totalTokensInput),
      output: Number(s.totalTokensOutput),
      total: Number(s.totalTokens),
    },
  });
});

// ── LangGraph agents status ──────────────────────────────────────────────

adminSettingsRoutes.get("/agents", async (c) => {
  try {
    const { langgraphClient } = await import("../../lib/langgraph-client.js");
    const assistants = await langgraphClient.listAssistants();
    return c.json({ agents: assistants });
  } catch (err) {
    return c.json({ error: "Failed to connect to LangGraph API", agents: [] }, 502);
  }
});

// ── Admin overview stats ────────────────────────────────────────────────

adminSettingsRoutes.get("/stats", async (c) => {
  // Plan distribution: count of orgs per plan
  const planRows = await sql`
    SELECT plan, COUNT(*)::int AS count
    FROM organizations
    GROUP BY plan
  `;
  const planDistribution: Record<string, number> = { free: 0, pro: 0, enterprise: 0 };
  for (const row of planRows) {
    planDistribution[(row as any).plan] = (row as any).count;
  }

  // User growth: users created per day in the last 7 days
  const growthRows = await sql`
    SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
    FROM users
    WHERE created_at >= now() - interval '7 days'
    GROUP BY day
    ORDER BY day ASC
  `;
  const userGrowth = growthRows.map((r: any) => ({ day: r.day, count: r.count }));

  // Total revenue estimate: pro=200, enterprise=2000
  const PLAN_PRICES: Record<string, number> = { free: 0, pro: 200, enterprise: 2000 };
  const totalRevenue = Object.entries(planDistribution).reduce(
    (sum, [plan, count]) => sum + (PLAN_PRICES[plan] ?? 0) * count,
    0,
  );

  // Total engagements this month
  const [scanRow] = await sql`
    SELECT COUNT(*)::int AS total
    FROM engagements
    WHERE created_at >= date_trunc('month', now())
  `;
  const totalScans = (scanRow as any)?.total ?? 0;

  // Total findings this month
  const [findingRow] = await sql`
    SELECT COUNT(*)::int AS total
    FROM findings
    WHERE created_at >= date_trunc('month', now())
  `;
  const totalFindings = (findingRow as any)?.total ?? 0;

  // Currently running agent_runs
  const [runningRow] = await sql`
    SELECT COUNT(*)::int AS total
    FROM agent_runs
    WHERE status = 'running'
  `;
  const activeAgentRuns = (runningRow as any)?.total ?? 0;

  return c.json({
    planDistribution,
    userGrowth,
    totalRevenue,
    totalScans,
    totalFindings,
    activeAgentRuns,
  });
});
