import type { AppVariables } from "../types.js";
/**
 * Public API v1 — External integration endpoints.
 *
 * Allows users to launch security assessments, check status, and retrieve
 * findings programmatically via API keys. Designed for CI/CD integration.
 *
 * Auth: Bearer API key (bjk_...) — no session cookie needed.
 * Base: https://api.bjhunt.com/api/v1
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { withOrg, sql } from "../db/client.js";
import { validateApiKey } from "../auth/api-keys.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { langgraphClient } from "../lib/langgraph-client.js";
import { config } from "../config.js";

export const publicApiRoutes = new Hono<{ Variables: AppVariables }>();

publicApiRoutes.use("*", rateLimit(config.rateLimit.api));

// ── API Key auth + plan gate middleware ──────────────────────────────────

publicApiRoutes.use("*", async (c, next) => {
  const auth = c.req.header("authorization") || "";
  if (!auth.startsWith("Bearer bjk_")) {
    return c.json({
      error: "unauthorized",
      message: "Missing or invalid API key. Use: Authorization: Bearer bjk_...",
      docs: "https://bjhunt.com/api-docs#auth",
    }, 401);
  }

  const token = auth.slice(7);
  const result = await validateApiKey(token);
  if (!result) {
    return c.json({ error: "unauthorized", message: "Invalid or expired API key" }, 401);
  }

  // Check org plan — API access requires Pro or Enterprise
  const [org] = await sql`SELECT plan FROM organizations WHERE id = ${result.orgId}`;
  const plan = (org as any)?.plan || "free";

  if (plan === "free") {
    return c.json({
      error: "plan_required",
      message: "API access requires a Pro or Enterprise plan. Upgrade at https://bjhunt.com/pricing",
      currentPlan: "free",
      requiredPlan: "pro",
    }, 403);
  }

  c.set("orgId" as never, result.orgId);
  c.set("userId" as never, result.userId);
  c.set("plan" as never, plan);
  await next();
});

// ── Schemas ─────────────────────────────────────────────────────────────

const createScanSchema = z.object({
  name: z.string().min(1).max(200),
  target: z.string().min(1).max(500),
  type: z.enum(["full", "recon", "web", "network", "cloud", "api"]).default("full"),
  config: z.object({
    agent: z.string().default("bjhunt"),
    depth: z.enum(["quick", "standard", "deep"]).default("standard"),
    excludePaths: z.array(z.string()).optional(),
    customHeaders: z.record(z.string()).optional(),
  }).optional(),
  webhook: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// ── POST /scans — Launch a security scan ────────────────────────────────

publicApiRoutes.post("/scans", zValidator("json", createScanSchema), async (c) => {
  const orgId = c.get("orgId" as never) as string;
  const userId = c.get("userId" as never) as string;
  const body = c.req.valid("json");

  // Plan-based limits
  const plan = c.get("plan" as never) as string;
  const planLimits: Record<string, { scans: number; agents: string[] }> = {
    pro: { scans: 50, agents: ["bjhunt", "recon", "exploit", "analyst", "cloud_hunter"] },
    enterprise: { scans: -1, agents: ["bjhunt", "recon", "exploit", "postexploit", "analyst", "reverser", "contract_auditor", "cloud_hunter", "ad_operator", "vulnresearch", "scanner", "detector", "verifier", "patcher", "exploiter", "defender"] },
  };
  const limits = planLimits[plan] || planLimits.pro!;

  // Check monthly scan quota
  if (limits.scans !== -1) {
    const [usage] = await withOrg(orgId, (tx) =>
      tx`SELECT count(*)::int as total FROM engagements
         WHERE created_at >= date_trunc('month', now())`,
    );
    if (((usage as any)?.total ?? 0) >= limits.scans) {
      return c.json({
        error: "quota_exceeded",
        message: `Monthly scan limit reached (${limits.scans}). Upgrade to Enterprise for unlimited scans.`,
        usage: (usage as any)?.total,
        limit: limits.scans,
      }, 429);
    }
  }

  const agentMap: Record<string, string> = {
    full: "bjhunt",
    recon: "recon",
    web: "exploit",
    network: "recon",
    cloud: "cloud_hunter",
    api: "analyst",
  };

  const agentGraph = body.config?.agent || agentMap[body.type] || "bjhunt";

  // Create engagement
  const [engagement] = await withOrg(orgId, (tx) =>
    tx`INSERT INTO engagements (org_id, created_by, name, target, status, agent_graph, config)
       VALUES (${orgId}, ${userId}, ${body.name}, ${body.target}, 'running', ${agentGraph},
               ${JSON.stringify({ type: body.type, depth: body.config?.depth, webhook: body.webhook, tags: body.tags })})
       RETURNING id, name, target, status, agent_graph, created_at`,
  );

  // Create LangGraph thread + start agent
  let threadId: string | null = null;
  try {
    const thread = await langgraphClient.createThread();
    threadId = thread.threadId;

    await withOrg(orgId, (tx) =>
      tx`UPDATE engagements SET langgraph_thread_id = ${threadId}, started_at = now() WHERE id = ${engagement!.id}`,
    );

    await langgraphClient.createRun(threadId, agentGraph, {
      target: body.target,
      engagement_id: engagement!.id,
      org_id: orgId,
      scan_type: body.type,
      depth: body.config?.depth || "standard",
    });
  } catch {
    await withOrg(orgId, (tx) =>
      tx`UPDATE engagements SET status = 'draft' WHERE id = ${engagement!.id}`,
    );
  }

  // Track agent run
  await sql`
    INSERT INTO agent_runs (org_id, engagement_id, agent_name, input_summary, status)
    VALUES (${orgId}, ${engagement!.id}, ${agentGraph}, ${`API scan: ${body.target}`}, 'running')
  `;

  // Audit log
  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource, details)
    VALUES (${orgId}, ${userId}, 'api.scan.create', ${"engagement:" + engagement!.id},
            ${JSON.stringify({ target: body.target, type: body.type, agent: agentGraph })})
  `;

  return c.json({
    id: engagement!.id,
    name: engagement!.name,
    target: engagement!.target,
    status: threadId ? "running" : "queued",
    agent: agentGraph,
    createdAt: engagement!.createdAt,
    _links: {
      self: `/api/v1/scans/${engagement!.id}`,
      findings: `/api/v1/scans/${engagement!.id}/findings`,
      status: `/api/v1/scans/${engagement!.id}/status`,
    },
  }, 201);
});

// ── GET /scans — List scans ─────────────────────────────────────────────

publicApiRoutes.get("/scans", async (c) => {
  const orgId = c.get("orgId" as never) as string;
  const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const status = c.req.query("status");

  const scans = await withOrg(orgId, (tx) => {
    if (status) {
      return tx`SELECT id, name, target, status, agent_graph, started_at, completed_at, created_at
                FROM engagements WHERE status = ${status}
                ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }
    return tx`SELECT id, name, target, status, agent_graph, started_at, completed_at, created_at
              FROM engagements ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  });

  return c.json({ scans, limit, offset });
});

// ── GET /scans/:id — Scan detail ────────────────────────────────────────

publicApiRoutes.get("/scans/:id", async (c) => {
  const orgId = c.get("orgId" as never) as string;
  const id = c.req.param("id");

  const [scan] = await withOrg(orgId, (tx) =>
    tx`SELECT id, name, target, status, agent_graph, config, started_at, completed_at, created_at
       FROM engagements WHERE id = ${id}`,
  );

  if (!scan) return c.json({ error: "not_found", message: "Scan not found" }, 404);
  return c.json({ scan });
});

// ── GET /scans/:id/status — Quick status check (for polling) ────────────

publicApiRoutes.get("/scans/:id/status", async (c) => {
  const orgId = c.get("orgId" as never) as string;
  const id = c.req.param("id");

  const [scan] = await withOrg(orgId, (tx) =>
    tx`SELECT status, started_at, completed_at FROM engagements WHERE id = ${id}`,
  );

  if (!scan) return c.json({ error: "not_found" }, 404);

  const [findingCount] = await withOrg(orgId, (tx) =>
    tx`SELECT count(*)::int as total,
              count(*) FILTER (WHERE severity = 'critical')::int as critical,
              count(*) FILTER (WHERE severity = 'high')::int as high
       FROM findings WHERE engagement_id = ${id}`,
  );

  return c.json({
    status: scan.status,
    startedAt: scan.startedAt,
    completedAt: scan.completedAt,
    findings: {
      total: (findingCount as any)?.total ?? 0,
      critical: (findingCount as any)?.critical ?? 0,
      high: (findingCount as any)?.high ?? 0,
    },
  });
});

// ── GET /scans/:id/findings — Scan findings ─────────────────────────────

publicApiRoutes.get("/scans/:id/findings", async (c) => {
  const orgId = c.get("orgId" as never) as string;
  const id = c.req.param("id");
  const severity = c.req.query("severity");

  const findings = await withOrg(orgId, (tx) => {
    if (severity) {
      return tx`SELECT id, title, description, severity, cvss_score, cvss_vector,
                       cve_ids, mitre_attack, evidence, remediation, status, created_at
                FROM findings WHERE engagement_id = ${id} AND severity = ${severity}
                ORDER BY cvss_score DESC NULLS LAST`;
    }
    return tx`SELECT id, title, description, severity, cvss_score, cvss_vector,
                     cve_ids, mitre_attack, evidence, remediation, status, created_at
              FROM findings WHERE engagement_id = ${id}
              ORDER BY CASE severity
                WHEN 'critical' THEN 0 WHEN 'high' THEN 1
                WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
                cvss_score DESC NULLS LAST`;
  });

  return c.json({ findings, total: findings.length });
});

// ── DELETE /scans/:id — Cancel/delete a scan ────────────────────────────

publicApiRoutes.delete("/scans/:id", async (c) => {
  const orgId = c.get("orgId" as never) as string;
  const userId = c.get("userId" as never) as string;
  const id = c.req.param("id");

  const [scan] = await withOrg(orgId, (tx) =>
    tx`SELECT status FROM engagements WHERE id = ${id}`,
  );

  if (!scan) return c.json({ error: "not_found" }, 404);

  if (scan.status === "running") {
    await withOrg(orgId, (tx) =>
      tx`UPDATE engagements SET status = 'cancelled', completed_at = now() WHERE id = ${id}`,
    );
  } else {
    await withOrg(orgId, (tx) =>
      tx`DELETE FROM engagements WHERE id = ${id}`,
    );
  }

  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource)
    VALUES (${orgId}, ${userId}, 'api.scan.delete', ${"engagement:" + id})
  `;

  return c.json({ ok: true });
});

// ── GET /agents — List available agents ─────────────────────────────────

publicApiRoutes.get("/agents", async (c) => {
  const agents = [
    { id: "bjhunt", name: "BJHUNT Orchestrator", description: "Full autonomous assessment — coordinates all agents", type: "full" },
    { id: "recon", name: "Recon", description: "OSINT, subdomain enumeration, port scanning, service detection", type: "recon" },
    { id: "exploit", name: "Exploit", description: "SQLi, SSTI, Kerberoasting, ADCS, credential attacks", type: "web" },
    { id: "postexploit", name: "Post-Exploit", description: "Credential access, privilege escalation, lateral movement, C2", type: "network" },
    { id: "analyst", name: "Analyst", description: "Code review, static analysis, CVE sweeps, fuzzing", type: "api" },
    { id: "cloud_hunter", name: "Cloud Hunter", description: "AWS IAM privesc, S3 takeover, K8s RBAC, Terraform secrets", type: "cloud" },
    { id: "ad_operator", name: "AD Operator", description: "BloodHound, Kerberoast, AS-REP, ADCS, DCSync", type: "network" },
    { id: "reverser", name: "Reverser", description: "ELF/PE/firmware triage, ROP gadgets, Ghidra scripts", type: "api" },
    { id: "contract_auditor", name: "Contract Auditor", description: "Solidity/EVM reentrancy, flash loans, Slither, Foundry PoC", type: "api" },
    { id: "vulnresearch", name: "VulnResearch", description: "Vulnerability research pipeline — scan, detect, verify, patch", type: "full" },
  ];

  return c.json({ agents });
});
