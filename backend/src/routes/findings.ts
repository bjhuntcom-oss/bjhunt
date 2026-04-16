import type { AppVariables } from "../types.js";
/**
 * Findings routes — list/search/stats across all engagements for an org.
 */

import { Hono } from "hono";
import { withOrg } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { config } from "../config.js";

export const findingsRoutes = new Hono<{ Variables: AppVariables }>();

findingsRoutes.use("*", requireAuth);
findingsRoutes.use("*", rateLimit(config.rateLimit.api));

// ── Stats — counts by severity ──────────────────────────────────────────

findingsRoutes.get("/stats", async (c) => {
  const orgId = c.get("orgId") as string;

  const rows = await withOrg(orgId, (tx) =>
    tx`
      SELECT severity, COUNT(*)::int AS count
      FROM findings
      GROUP BY severity
    `,
  );

  const stats: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    total: 0,
  };

  for (const row of rows) {
    stats[row.severity as string] = row.count as number;
    stats.total += row.count as number;
  }

  return c.json({ stats });
});

// ── List all findings (paginated, filterable) ───────────────────────────

findingsRoutes.get("/", async (c) => {
  const orgId = c.get("orgId") as string;
  const severity = c.req.query("severity");
  const engagementId = c.req.query("engagement_id");
  const search = c.req.query("q");
  const status = c.req.query("status");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const findings = await withOrg(orgId, async (tx) => {
    // Build dynamic WHERE conditions
    const conditions: ReturnType<typeof tx>[] = [];

    if (severity) {
      conditions.push(tx`severity = ${severity}`);
    }
    if (engagementId) {
      conditions.push(tx`engagement_id = ${engagementId}::uuid`);
    }
    if (status) {
      conditions.push(tx`status = ${status}`);
    }
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        tx`(title ILIKE ${pattern} OR description ILIKE ${pattern} OR ${search} = ANY(cve_ids))`,
      );
    }

    if (conditions.length === 0) {
      return tx`
        SELECT f.*, e.name AS engagement_name
        FROM findings f
        LEFT JOIN engagements e ON e.id = f.engagement_id
        ORDER BY
          CASE f.severity
            WHEN 'critical' THEN 0
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
            WHEN 'info' THEN 4
          END,
          f.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // With conditions — use raw conditional building
    // postgres.js supports tagged template fragments for safe composition
    const where = conditions.reduce(
      (acc, cond, i) => (i === 0 ? tx`WHERE ${cond}` : tx`${acc} AND ${cond}`),
      tx``,
    );

    return tx`
      SELECT f.*, e.name AS engagement_name
      FROM findings f
      LEFT JOIN engagements e ON e.id = f.engagement_id
      ${where}
      ORDER BY
        CASE f.severity
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          WHEN 'info' THEN 4
        END,
        f.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  });

  // Get total count for pagination
  const [countRow] = await withOrg(orgId, async (tx) => {
    const conditions: ReturnType<typeof tx>[] = [];

    if (severity) {
      conditions.push(tx`severity = ${severity}`);
    }
    if (engagementId) {
      conditions.push(tx`engagement_id = ${engagementId}::uuid`);
    }
    if (status) {
      conditions.push(tx`status = ${status}`);
    }
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        tx`(title ILIKE ${pattern} OR description ILIKE ${pattern} OR ${search} = ANY(cve_ids))`,
      );
    }

    if (conditions.length === 0) {
      return tx`SELECT COUNT(*)::int AS count FROM findings`;
    }

    const where = conditions.reduce(
      (acc, cond, i) => (i === 0 ? tx`WHERE ${cond}` : tx`${acc} AND ${cond}`),
      tx``,
    );

    return tx`SELECT COUNT(*)::int AS count FROM findings ${where}`;
  });

  return c.json({ findings, total: countRow?.count ?? 0 });
});

// ── Get single finding ──────────────────────────────────────────────────

findingsRoutes.get("/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  const [finding] = await withOrg(orgId, (tx) =>
    tx`
      SELECT f.*, e.name AS engagement_name, e.target AS engagement_target
      FROM findings f
      LEFT JOIN engagements e ON e.id = f.engagement_id
      WHERE f.id = ${id}
    `,
  );

  if (!finding) return c.json({ error: "Finding not found" }, 404);
  return c.json({ finding });
});
