import type { AppVariables } from "../types.js";
/**
 * Billing routes — plan info and usage metrics for the authenticated org.
 */

import { Hono } from "hono";
import { withOrg, sql } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { config } from "../config.js";

export const billingRoutes = new Hono<{ Variables: AppVariables }>();

billingRoutes.use("*", requireAuth);
billingRoutes.use("*", rateLimit(config.rateLimit.api));

// ── Plan limits definition ─────────────────────────────────────────────

const PLAN_LIMITS: Record<
  string,
  { engagements: number; tokensPerMonth: number; agents: number }
> = {
  free: { engagements: 5, tokensPerMonth: 2_000_000, agents: 3 },
  pro: { engagements: 50, tokensPerMonth: 20_000_000, agents: 17 },
  enterprise: { engagements: -1, tokensPerMonth: -1, agents: 17 },
};

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
  const limits = PLAN_LIMITS[org.plan] ?? PLAN_LIMITS.free;

  return c.json({
    plan: org.plan,
    displayName: org.plan.charAt(0).toUpperCase() + org.plan.slice(1),
    orgName: org.name,
    limits,
  });
});

// ── GET /usage — current month usage ───────────────────────────────────

billingRoutes.get("/usage", async (c) => {
  const orgId = c.get("orgId") as string;

  const [engagementRows, tokenRows, findingRows, orgRows] = await Promise.all([
    // Engagements created this month
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
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS["free"]!;

  const engagementsUsed = (engagementRows[0] as any)?.count ?? 0;
  const tokenRow = tokenRows[0] as any;
  const tokensUsed =
    (tokenRow?.tokens_input ?? 0) + (tokenRow?.tokens_output ?? 0);
  const findingsCount = (findingRows[0] as any)?.count ?? 0;

  return c.json({
    plan,
    limits,
    usage: {
      engagements: engagementsUsed,
      tokensUsed,
      findings: findingsCount,
    },
    percentages: {
      engagements:
        limits.engagements === -1
          ? 0
          : Math.round((engagementsUsed / limits.engagements) * 100),
      tokens:
        limits.tokensPerMonth === -1
          ? 0
          : Math.round((tokensUsed / limits.tokensPerMonth) * 100),
    },
  });
});
