import type { AppVariables } from "../types.js";
/**
 * Findings routes — list/search/stats across all engagements for an org.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { withOrg } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { config } from "../config.js";
import type { AuthUser } from "../middleware/auth.js";

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
  const limit = Math.min(Math.max(1, parseInt(c.req.query("limit") || "50", 10) || 50), 100);
  const offset = Math.max(0, parseInt(c.req.query("offset") || "0", 10) || 0);

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

// ── Update finding remediation status ──────────────────────────────────

const updateFindingSchema = z.object({
  status: z.enum(["open", "remediated", "verified", "false_positive", "accepted"]).optional(),
  remediationStatus: z.enum(["pending", "applied", "verified"]).optional(),
});

findingsRoutes.patch("/:id", zValidator("json", updateFindingSchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const values: Record<string, unknown> = {};
  if (body.status !== undefined) values.status = body.status;
  if (body.remediationStatus !== undefined) values.remediationStatus = body.remediationStatus;

  if (Object.keys(values).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  const [updated] = await withOrg(orgId, (tx) =>
    tx`UPDATE findings SET ${tx(values as any)} WHERE id = ${id} RETURNING *`,
  );

  if (!updated) return c.json({ error: "Finding not found" }, 404);

  await withOrg(orgId, (tx) =>
    tx`
      INSERT INTO audit_logs (org_id, user_id, action, resource, details)
      VALUES (${orgId}, ${user.id}, 'finding.update',
              ${"finding:" + id}, ${JSON.stringify({ fields: Object.keys(values) })})
    `,
  ).catch(() => {});

  return c.json({ finding: updated });
});

// ── Batch export findings ──────────────────────────────────────────────

findingsRoutes.post("/export", async (c) => {
  const orgId = c.get("orgId") as string;
  const body = await c.req.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

  if (ids.length === 0) {
    return c.json({ error: "No finding IDs provided" }, 400);
  }

  // Sanitize: only allow UUIDs
  const validIds = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (validIds.length === 0) {
    return c.json({ error: "No valid finding IDs provided" }, 400);
  }

  const findings = await withOrg(orgId, (tx) =>
    tx`
      SELECT f.*, e.name AS engagement_name, e.target AS engagement_target
      FROM findings f
      LEFT JOIN engagements e ON e.id = f.engagement_id
      WHERE f.id = ANY(${validIds}::uuid[])
      ORDER BY
        CASE f.severity
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          WHEN 'info' THEN 4
        END
    `,
  );

  // Build CSV
  const headers = ["ID", "Title", "Severity", "CVSS", "CVE IDs", "MITRE ATT&CK", "Status", "Description", "Remediation", "Engagement", "Created"];
  const rows = findings.map((f: any) => [
    f.id,
    `"${(f.title || "").replace(/"/g, '""')}"`,
    f.severity,
    f.cvssScore ?? "",
    (f.cveIds || []).join("; "),
    (f.mitreAttack || []).join("; "),
    f.status,
    `"${(f.description || "").replace(/"/g, '""').slice(0, 500)}"`,
    `"${(f.remediation || "").replace(/"/g, '""').slice(0, 500)}"`,
    f.engagementName || "",
    f.createdAt || "",
  ]);

  const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="findings-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
