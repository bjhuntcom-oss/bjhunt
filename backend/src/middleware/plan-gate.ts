/**
 * Plan enforcement middleware — gates features by org plan.
 */

import type { MiddlewareHandler } from "hono";
import { sql } from "../db/client.js";
import { getPlanLimits } from "../plans.js";

async function getOrgPlan(orgId: string): Promise<string> {
  const [org] = await sql`SELECT plan FROM organizations WHERE id = ${orgId}`;
  return (org as any)?.plan || "free";
}

/** Require minimum plan level */
export function requirePlan(...allowed: string[]): MiddlewareHandler {
  return async (c, next) => {
    const orgId = c.get("orgId") as string;
    if (!orgId) return c.json({ error: "Authentication required" }, 401);

    const plan = await getOrgPlan(orgId);
    if (!allowed.includes(plan)) {
      return c.json({
        error: "plan_required",
        message: `This feature requires a ${allowed.join(" or ")} plan. Current: ${plan}`,
        currentPlan: plan,
        requiredPlans: allowed,
        upgradeUrl: "https://bjhunt.com/pricing",
      }, 403);
    }

    c.set("plan" as never, plan);
    await next();
  };
}

/** Enforce monthly scan quota */
export function enforceScanQuota(): MiddlewareHandler {
  return async (c, next) => {
    const orgId = c.get("orgId") as string;
    const plan = (c.get("plan" as never) as string) || await getOrgPlan(orgId);
    const limits = getPlanLimits(plan);

    if (!limits.canCreateEngagements) {
      return c.json({
        error: "plan_restricted",
        message: "Le plan gratuit ne permet pas de créer des scans. Passez au plan Pro.",
        upgradeUrl: "https://bjhunt.com/pricing",
      }, 403);
    }

    const [usage] = await sql`
      SELECT count(*)::int as total FROM engagements
      WHERE org_id = ${orgId} AND created_at >= date_trunc('month', now())
    `;
    const used = (usage as any)?.total ?? 0;

    if (used >= limits.scansPerMonth) {
      return c.json({
        error: "quota_exceeded",
        message: `Quota de scans atteint (${used}/${limits.scansPerMonth}). Passez au plan supérieur.`,
        usage: used,
        limit: limits.scansPerMonth,
        upgradeUrl: "https://bjhunt.com/pricing",
      }, 429);
    }

    await next();
  };
}

/** Enforce 5-min demo for free plan chat */
export function enforceDemoLimit(): MiddlewareHandler {
  return async (c, next) => {
    const orgId = c.get("orgId") as string;
    const plan = (c.get("plan" as never) as string) || await getOrgPlan(orgId);

    if (plan !== "free") return next();

    const [org] = await sql`SELECT demo_started_at FROM organizations WHERE id = ${orgId}`;
    const demoStart = (org as any)?.demoStartedAt;

    if (!demoStart) {
      // First chat — start the demo timer
      await sql`UPDATE organizations SET demo_started_at = now() WHERE id = ${orgId}`;
      return next();
    }

    const elapsed = Date.now() - new Date(demoStart as string).getTime();
    const DEMO_MS = 5 * 60 * 1000;

    if (elapsed > DEMO_MS) {
      return c.json({
        error: "demo_expired",
        message: "Votre session démo de 5 minutes est terminée. Passez au plan Pro pour un accès illimité.",
        elapsed: Math.round(elapsed / 1000),
        limit: 300,
        upgradeUrl: "https://bjhunt.com/pricing",
      }, 403);
    }

    await next();
  };
}

/** Block API key creation for free plan */
export function requireApiKeyCreation(): MiddlewareHandler {
  return async (c, next) => {
    const orgId = c.get("orgId") as string;
    const plan = await getOrgPlan(orgId);
    const limits = getPlanLimits(plan);

    if (!limits.apiKeyCreation) {
      return c.json({
        error: "plan_restricted",
        message: "La création de clés API requiert un plan Pro ou Enterprise.",
        currentPlan: plan,
        upgradeUrl: "https://bjhunt.com/pricing",
      }, 403);
    }

    await next();
  };
}
