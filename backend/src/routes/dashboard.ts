import type { AppVariables } from "../types.js";
/**
 * Dashboard routes — computed stats for the authenticated user's org.
 */

import { Hono } from "hono";
import { withOrg, sql } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { config } from "../config.js";

export const dashboardRoutes = new Hono<{ Variables: AppVariables }>();

dashboardRoutes.use("*", requireAuth);
dashboardRoutes.use("*", rateLimit(config.rateLimit.api));

// ── GET /stats — aggregated dashboard statistics ────────────────────────

dashboardRoutes.get("/stats", async (c) => {
  const orgId = c.get("orgId") as string;

  // Run all queries in parallel for performance
  const [
    tokenRows,
    severityRows,
    scansPerDayRows,
    orgRows,
    sessionRows,
    auditRows,
  ] = await Promise.all([
    // Total tokens this month
    withOrg(orgId, (tx) =>
      tx`
        SELECT COALESCE(SUM(tokens_input), 0)::int AS tokens_input,
               COALESCE(SUM(tokens_output), 0)::int AS tokens_output
        FROM agent_runs
        WHERE created_at >= date_trunc('month', now())
      `,
    ),
    // Findings grouped by severity
    withOrg(orgId, (tx) =>
      tx`
        SELECT severity, COUNT(*)::int AS count
        FROM findings
        GROUP BY severity
      `,
    ),
    // Engagements per day for the last 7 days
    withOrg(orgId, (tx) =>
      tx`
        SELECT d::date AS date, COALESCE(c.count, 0)::int AS count
        FROM generate_series(
          (now() - interval '6 days')::date,
          now()::date,
          '1 day'
        ) AS d
        LEFT JOIN (
          SELECT created_at::date AS day, COUNT(*)::int AS count
          FROM engagements
          WHERE created_at >= (now() - interval '6 days')::date
          GROUP BY created_at::date
        ) c ON c.day = d::date
        ORDER BY d
      `,
    ),
    // Organization plan
    sql`SELECT plan FROM organizations WHERE id = ${orgId}`,
    // Active sessions count for this org
    sql`
      SELECT COUNT(*)::int AS count
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE u.org_id = ${orgId} AND s.expires_at > now()
    `,
    // Audit logs in last 24h for this org
    sql`
      SELECT COUNT(*)::int AS count
      FROM audit_logs
      WHERE org_id = ${orgId} AND created_at >= now() - interval '24 hours'
    `,
  ]);

  const tokenRow = tokenRows[0] as any;
  const plan = (orgRows[0] as any)?.plan ?? "free";
  const activeSessions = (sessionRows[0] as any)?.count ?? 0;
  const auditLogs24h = (auditRows[0] as any)?.count ?? 0;

  // Build severity map with defaults
  const severityMap: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const row of severityRows) {
    const r = row as any;
    severityMap[r.severity] = r.count;
  }

  return c.json({
    tokens: {
      input: tokenRow?.tokensInput ?? 0,
      output: tokenRow?.tokensOutput ?? 0,
      total: (tokenRow?.tokensInput ?? 0) + (tokenRow?.tokensOutput ?? 0),
    },
    severity: severityMap,
    scansPerDay: scansPerDayRows.map((r: any) => ({
      date: r.date,
      count: r.count,
    })),
    plan,
    activeSessions,
    auditLogs24h,
  });
});
