/**
 * Health check routes — liveness, readiness (all services), version.
 */

import { Hono } from "hono";
import { sql } from "../db/client.js";
import { config } from "../config.js";

export const healthRoutes = new Hono();

// Liveness — always returns 200 if the process is running
healthRoutes.get("/live", (c) => c.json({ status: "ok" }));

// Readiness — checks ALL service connectivity
healthRoutes.get("/ready", async (c) => {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // PostgreSQL
  const dbStart = Date.now();
  try {
    await sql`SELECT 1`;
    checks.database = { status: "connected", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: "disconnected", latencyMs: Date.now() - dbStart };
  }

  // Redis
  const redisStart = Date.now();
  try {
    const { Redis } = await import("ioredis");
    const redis = new Redis(config.redis.url, { maxRetriesPerRequest: 1, connectTimeout: 3000 });
    await redis.ping();
    checks.redis = { status: "connected", latencyMs: Date.now() - redisStart };
    await redis.quit();
  } catch {
    checks.redis = { status: "disconnected", latencyMs: Date.now() - redisStart };
  }

  // LangGraph API
  const lgStart = Date.now();
  try {
    const { langgraphClient } = await import("../lib/langgraph-client.js");
    const ok = await langgraphClient.health();
    checks.langgraph = { status: ok ? "connected" : "disconnected", latencyMs: Date.now() - lgStart };
  } catch {
    checks.langgraph = { status: "disconnected", latencyMs: Date.now() - lgStart };
  }

  // Neo4j (HTTP browser endpoint)
  const neo4jStart = Date.now();
  try {
    const neo4jUrl = process.env.NEO4J_HTTP_URL || "http://neo4j:7474";
    const res = await fetch(neo4jUrl, { signal: AbortSignal.timeout(3000) });
    checks.neo4j = { status: res.ok ? "connected" : "disconnected", latencyMs: Date.now() - neo4jStart };
  } catch {
    checks.neo4j = { status: "disconnected", latencyMs: Date.now() - neo4jStart };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "connected");

  return c.json({
    status: allHealthy ? "ready" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  }, allHealthy ? 200 : 503);
});

// Prometheus metrics (VPS-P2-7) — Open metrics format. Minimal counters
// exposed without pulling in prom-client; can be expanded later via the
// observability roadmap. The container's healthcheck uses /api/health/live
// which doesn't increment this counter (filtered upstream by the logger
// middleware to keep noise down).
const startedAt = Date.now();
let totalRequests = 0;

healthRoutes.use("*", async (c, next) => {
  totalRequests += 1;
  return next();
});

healthRoutes.get("/metrics", async (c) => {
  // Pull a few cheap DB metrics so Grafana has something to render
  // out-of-the-box before per-domain dashboards land.
  let usersCount = 0;
  let engagementsRunning = 0;
  let findingsTotal = 0;
  let agentRunsRunning = 0;
  try {
    const results = await Promise.all([
      sql`SELECT count(*)::int AS n FROM users`,
      sql`SELECT count(*)::int AS n FROM engagements WHERE status = 'running'`,
      sql`SELECT count(*)::int AS n FROM findings`,
      sql`SELECT count(*)::int AS n FROM agent_runs WHERE status = 'running'`,
    ]);
    usersCount = (results[0]?.[0] as { n?: number } | undefined)?.n ?? 0;
    engagementsRunning = (results[1]?.[0] as { n?: number } | undefined)?.n ?? 0;
    findingsTotal = (results[2]?.[0] as { n?: number } | undefined)?.n ?? 0;
    agentRunsRunning = (results[3]?.[0] as { n?: number } | undefined)?.n ?? 0;
  } catch {
    // best-effort
  }

  const memUsage = process.memoryUsage();
  const lines = [
    "# HELP bjhunt_uptime_seconds Process uptime in seconds",
    "# TYPE bjhunt_uptime_seconds gauge",
    `bjhunt_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`,
    "# HELP bjhunt_requests_total Total HTTP requests served",
    "# TYPE bjhunt_requests_total counter",
    `bjhunt_requests_total ${totalRequests}`,
    "# HELP bjhunt_memory_rss_bytes Resident set size in bytes",
    "# TYPE bjhunt_memory_rss_bytes gauge",
    `bjhunt_memory_rss_bytes ${memUsage.rss}`,
    "# HELP bjhunt_memory_heap_used_bytes Heap used bytes",
    "# TYPE bjhunt_memory_heap_used_bytes gauge",
    `bjhunt_memory_heap_used_bytes ${memUsage.heapUsed}`,
    "# HELP bjhunt_users_total Number of registered users",
    "# TYPE bjhunt_users_total gauge",
    `bjhunt_users_total ${usersCount}`,
    "# HELP bjhunt_engagements_running Number of engagements currently running",
    "# TYPE bjhunt_engagements_running gauge",
    `bjhunt_engagements_running ${engagementsRunning}`,
    "# HELP bjhunt_findings_total Total findings recorded across all engagements",
    "# TYPE bjhunt_findings_total gauge",
    `bjhunt_findings_total ${findingsTotal}`,
    "# HELP bjhunt_agent_runs_running Number of agent_runs currently running",
    "# TYPE bjhunt_agent_runs_running gauge",
    `bjhunt_agent_runs_running ${agentRunsRunning}`,
    "",
  ];
  c.header("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  return c.body(lines.join("\n"));
});

// Public plan catalog (DASH-P2). Mounted under /api/health so it's reachable
// without auth — used by /pricing + /dashboard/guide to keep the displayed
// limits aligned with backend/src/plans.ts. Returns the same shape as
// PLAN_LIMITS without internal flags that aren't user-facing.
healthRoutes.get("/plans", async (c) => {
  const { PLAN_LIMITS } = await import("../plans.js");
  const publicView = Object.fromEntries(
    Object.entries(PLAN_LIMITS).map(([key, p]) => [
      key,
      {
        name: key,
        price: p.price,
        priceDisplay: p.priceDisplay,
        scansPerMonth: p.scansPerMonth,
        agents: p.agents.length,
        chatUnlimited: p.chatUnlimited,
        demoMinutes: p.demoMinutes,
        apiKeyCreation: p.apiKeyCreation,
        apiV1Access: p.apiV1Access,
        webhookIntegrations: p.webhookIntegrations,
        exportMarkdown: p.exportMarkdown,
        exportCsv: p.exportCsv,
      },
    ]),
  );
  return c.json({ plans: publicView });
});

// Version — exposes the deployed git commit for `deploy-vps.yml` post-deploy verification.
// GIT_COMMIT is injected at build time via Dockerfile ARG (or container env on VPS).
healthRoutes.get("/version", (c) =>
  c.json({
    name: "bjhunt-backend",
    version: process.env.npm_package_version || "0.1.0",
    commit: process.env.GIT_COMMIT || "unknown",
    runtime: "bun",
    engine: "BJHUNT ALPHA 1.0",
    builtAt: process.env.BUILD_TIMESTAMP || null,
  }),
);
