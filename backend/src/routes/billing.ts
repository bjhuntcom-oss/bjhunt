import type { AppVariables } from "../types.js";
/**
 * Billing routes — plan info and usage metrics for the authenticated org.
 */

import { Hono } from "hono";
import { withOrg, sql } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { config } from "../config.js";
import { getPlanLimits } from "../plans.js";

export const billingRoutes = new Hono<{ Variables: AppVariables }>();

billingRoutes.use("*", requireAuth);
billingRoutes.use("*", rateLimit(config.rateLimit.api));

// ── GET /plan — current org plan with limits ───────────────────────────

billingRoutes.get("/plan", async (c) => {
  const orgId = c.get("orgId") as string;

  const rows = await sql`
    SELECT plan, name FROM organizations WHERE id = ${orgId}
  `;

  if (rows.length === 0) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const org = rows[0] as { plan: string; name: string };
  const limits = getPlanLimits(org.plan);

  return c.json({
    plan: org.plan,
    displayName: org.plan.charAt(0).toUpperCase() + org.plan.slice(1),
    orgName: org.name,
    priceDisplay: limits.priceDisplay,
    limits: {
      scansPerMonth: limits.scansPerMonth,
      agents: limits.agents,
      chatUnlimited: limits.chatUnlimited,
      findingsExport: limits.findingsExport,
      apiV1Access: limits.apiV1Access,
      webhookIntegrations: limits.webhookIntegrations,
      customAgentConfig: limits.customAgentConfig,
      demoMinutes: limits.demoMinutes,
    },
  });
});

// ── GET /usage — current month usage ───────────────────────────────────

billingRoutes.get("/usage", async (c) => {
  const orgId = c.get("orgId") as string;

  const [scanRows, tokenRows, findingRows, orgRows] = await Promise.all([
    // Scans (engagements) created this month
    withOrg(orgId, (tx) =>
      tx`
        SELECT COUNT(*)::int AS count
        FROM engagements
        WHERE created_at >= date_trunc('month', now())
      `,
    ),
    // Tokens consumed this month (input + output)
    withOrg(orgId, (tx) =>
      tx`
        SELECT COALESCE(SUM(tokens_input), 0)::int AS tokens_input,
               COALESCE(SUM(tokens_output), 0)::int AS tokens_output
        FROM agent_runs
        WHERE created_at >= date_trunc('month', now())
      `,
    ),
    // Findings created this month
    withOrg(orgId, (tx) =>
      tx`
        SELECT COUNT(*)::int AS count
        FROM findings
        WHERE created_at >= date_trunc('month', now())
      `,
    ),
    // Org plan
    sql`SELECT plan FROM organizations WHERE id = ${orgId}`,
  ]);

  const plan: string = (orgRows[0] as any)?.plan ?? "free";
  const limits = getPlanLimits(plan);

  const scansUsed = (scanRows[0] as any)?.count ?? 0;
  const tokenRow = tokenRows[0] as any;
  const tokensUsed =
    (tokenRow?.tokens_input ?? 0) + (tokenRow?.tokens_output ?? 0);
  const findingsCount = (findingRows[0] as any)?.count ?? 0;

  return c.json({
    plan,
    priceDisplay: limits.priceDisplay,
    limits: {
      scansPerMonth: limits.scansPerMonth,
      agents: limits.agents,
      chatUnlimited: limits.chatUnlimited,
      findingsExport: limits.findingsExport,
      apiV1Access: limits.apiV1Access,
      webhookIntegrations: limits.webhookIntegrations,
    },
    usage: {
      scans: scansUsed,
      scansLimit: limits.scansPerMonth,
      tokensUsed,
      findings: findingsCount,
    },
    percentages: {
      scans:
        limits.scansPerMonth === 0
          ? 100
          : Math.round((scansUsed / limits.scansPerMonth) * 100),
    },
  });
});
