/**
 * Admin — audit log query endpoint.
 *
 * Per docs/architecture/05-BACKEND-API.md §Admin and 14-SECURITY.md §Audit Trail.
 * Backs the `/dashboard/admin/logs` page.
 *
 * The audit_logs table is global (cross-org) for super_admin visibility on
 * platform-level events. Tenant-scoped queries are also supported via
 * the `?org_id=` filter.
 */

import type { AppVariables } from "../../types.js";
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { withSuperAdmin } from "../../db/client.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { config } from "../../config.js";

export const adminLogsRoutes = new Hono<{ Variables: AppVariables }>();

adminLogsRoutes.use("*", requireAuth);
adminLogsRoutes.use("*", requireAdmin);
adminLogsRoutes.use("*", rateLimit(config.rateLimit.api));

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  action: z.string().max(120).optional(),
  user_id: z.string().uuid().optional(),
  org_id: z.string().uuid().optional(),
  resource: z.string().max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

adminLogsRoutes.get("/", zValidator("query", listQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const offset = (q.page - 1) * q.limit;

  // Cross-tenant read by definition — uses adminSql / BYPASSRLS pool.
  const result = await withSuperAdmin(async (sql) => {
    const conditions: ReturnType<typeof sql>[] = [];
    if (q.action) conditions.push(sql`action = ${q.action}`);
    if (q.user_id) conditions.push(sql`user_id = ${q.user_id}`);
    if (q.org_id) conditions.push(sql`org_id = ${q.org_id}`);
    if (q.resource) conditions.push(sql`resource = ${q.resource}`);
    if (q.from) conditions.push(sql`created_at >= ${q.from.toISOString()}`);
    if (q.to) conditions.push(sql`created_at <= ${q.to.toISOString()}`);

    const where = conditions.length
      ? conditions.reduce((acc, cond, i) => (i === 0 ? sql`WHERE ${cond}` : sql`${acc} AND ${cond}`))
      : sql``;

    const [{ total }] = await sql<[{ total: number }]>`
      SELECT COUNT(*)::int AS total FROM audit_logs ${where}
    `;

    const rows = await sql`
      SELECT id, org_id, user_id, action, resource, details, ip_address, created_at
      FROM audit_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT ${q.limit} OFFSET ${offset}
    `;

    return { rows, total };
  });

  return c.json({
    logs: result.rows,
    total: result.total,
    page: q.page,
    limit: q.limit,
  });
});

/** Distinct action values — useful to populate a filter dropdown in the UI. */
adminLogsRoutes.get("/actions", async (c) => {
  const rows = await withSuperAdmin(async (sql) =>
    sql<{ action: string; count: number }[]>`
      SELECT action, COUNT(*)::int AS count
      FROM audit_logs
      WHERE created_at > now() - interval '30 days'
      GROUP BY action
      ORDER BY count DESC
      LIMIT 100
    `,
  );
  return c.json({ actions: rows });
});

/**
 * CSV export — same filters as `GET /` but cap at 50k rows to avoid
 * memory issues. Streams as `text/csv` for direct browser download.
 */
adminLogsRoutes.get("/export", zValidator("query", listQuerySchema.partial()), async (c) => {
  const q = c.req.valid("query") as Partial<z.infer<typeof listQuerySchema>>;
  const cap = 50_000;

  const rows = await withSuperAdmin(async (sql) => {
    const conditions: ReturnType<typeof sql>[] = [];
    if (q.action) conditions.push(sql`action = ${q.action}`);
    if (q.user_id) conditions.push(sql`user_id = ${q.user_id}`);
    if (q.org_id) conditions.push(sql`org_id = ${q.org_id}`);
    if (q.resource) conditions.push(sql`resource = ${q.resource}`);
    if (q.from) conditions.push(sql`created_at >= ${q.from.toISOString()}`);
    if (q.to) conditions.push(sql`created_at <= ${q.to.toISOString()}`);
    const where = conditions.length
      ? conditions.reduce((acc, cond, i) => (i === 0 ? sql`WHERE ${cond}` : sql`${acc} AND ${cond}`))
      : sql``;

    return sql<{
      id: string;
      org_id: string | null;
      user_id: string | null;
      action: string;
      resource: string | null;
      ip_address: string | null;
      created_at: Date;
    }[]>`
      SELECT id, org_id, user_id, action, resource, ip_address, created_at
      FROM audit_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT ${cap}
    `;
  });

  const escape = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = "id,org_id,user_id,action,resource,ip_address,created_at\n";
  const body = rows
    .map(
      (r) =>
        [r.id, r.org_id, r.user_id, r.action, r.resource, r.ip_address, r.created_at.toISOString()]
          .map(escape)
          .join(",") + "\n",
    )
    .join("");

  const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  return c.body(header + body);
});
