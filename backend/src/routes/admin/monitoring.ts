/**
 * Admin — monitoring endpoint (health summary + queue overview).
 *
 * Per docs/architecture/05-BACKEND-API.md §Admin Monitoring and
 * 08-DASHBOARD-ADMIN.md. Backs the `/dashboard/admin/monitoring` page.
 *
 * `health` reuses the public /api/health/ready logic but with finer-grained
 * per-service stats (latencies, last error string).
 * `queue` is a stub until W4 lands BullMQ — it currently reports
 * `not_implemented` so the UI can display a clear "coming soon" message.
 */

import type { AppVariables } from "../../types.js";
import { Hono } from "hono";
import { withSuperAdmin, sql } from "../../db/client.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { config } from "../../config.js";

export const adminMonitoringRoutes = new Hono<{ Variables: AppVariables }>();

adminMonitoringRoutes.use("*", requireAuth);
adminMonitoringRoutes.use("*", requireAdmin);
adminMonitoringRoutes.use("*", rateLimit(config.rateLimit.api));

interface ServiceProbe {
  status: "connected" | "disconnected";
  latencyMs: number;
  error?: string;
}

async function probe(name: string, run: () => Promise<void>): Promise<ServiceProbe> {
  const start = Date.now();
  try {
    await run();
    return { status: "connected", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "disconnected",
      latencyMs: Date.now() - start,
      error: (err as Error).message?.slice(0, 200),
    };
  }
}

adminMonitoringRoutes.get("/health", async (c) => {
  const services: Record<string, ServiceProbe> = {};

  services.postgres = await probe("postgres", async () => {
    // Use adminSql for the health probe — does NOT depend on RLS context.
    await withSuperAdmin(async (s) => {
      await s`SELECT 1`;
    });
  });

  services.redis = await probe("redis", async () => {
    const { Redis } = await import("ioredis");
    const redis = new Redis(config.redis.url, { maxRetriesPerRequest: 1, connectTimeout: 3000 });
    await redis.ping();
    await redis.quit();
  });

  services.langgraph = await probe("langgraph", async () => {
    const { langgraphClient } = await import("../../lib/langgraph-client.js");
    const ok = await langgraphClient.health();
    if (!ok) throw new Error("LangGraph healthcheck returned false");
  });

  services.neo4j = await probe("neo4j", async () => {
    const url = process.env.NEO4J_HTTP_URL || "http://neo4j:7474";
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`Neo4j HTTP ${res.status}`);
  });

  services.litellm = await probe("litellm", async () => {
    const url = process.env.LITELLM_URL || "http://litellm:4000";
    const res = await fetch(`${url}/health/readiness`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`LiteLLM HTTP ${res.status}`);
  });

  const allHealthy = Object.values(services).every((s) => s.status === "connected");
  return c.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      services,
      timestamp: new Date().toISOString(),
    },
    allHealthy ? 200 : 503,
  );
});

adminMonitoringRoutes.get("/metrics", async (c) => {
  // Lightweight DB-derived metrics (no Prometheus scrape yet — that lands W11).
  // Cross-tenant aggregates → adminSql / BYPASSRLS pool.
  const data = await withSuperAdmin(async (sql) => {
    const [users] = await sql<[{ total: number; active_30d: number }]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE last_active_at > now() - interval '30 days')::int AS active_30d
      FROM users
    `;
    const [engagements] = await sql<[{ total: number; running: number; this_month: number }]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'running')::int AS running,
             COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS this_month
      FROM engagements
    `;
    const [findings] = await sql<[{ total: number; critical: number; high: number }]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
             COUNT(*) FILTER (WHERE severity = 'high')::int AS high
      FROM findings
    `;
    return { users, engagements, findings };
  });

  return c.json({
    ...data,
    timestamp: new Date().toISOString(),
  });
});

adminMonitoringRoutes.get("/queue", (c) => {
  // BullMQ wiring lands in W4 (job manager). Until then, return a
  // graceful "not yet" state so the UI can render an appropriate message.
  return c.json({
    status: "not_implemented",
    message:
      "Job queue introspection lands in W4. The orchestration currently runs synchronously via LangGraph stream.",
  });
});
