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

// Version
healthRoutes.get("/version", (c) =>
  c.json({
    name: "bjhunt-backend",
    version: process.env.npm_package_version || "0.1.0",
    runtime: "bun",
    engine: "BJHUNT ALPHA 1.0",
  }),
);
