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

// ── W10 Stripe scaffolding (ENG-P0-3) ────────────────────────────────────
// All three endpoints return 501 until STRIPE_SECRET_KEY is configured in
// env. This lets us ship the route shape, audit log entries, idempotency
// table (migration 0010) and frontend wiring NOW; flipping the env var
// activates Stripe without further code changes.

const stripeEnabled = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY);

billingRoutes.post("/checkout", async (c) => {
  const orgId = c.get("orgId") as string;
  if (!stripeEnabled()) {
    return c.json(
      {
        error: "stripe_not_configured",
        message:
          "Stripe checkout is not yet active. Subscribe via /contact for manual provisioning.",
      },
      501,
    );
  }
  // When STRIPE_SECRET_KEY is set, the dynamic import keeps the SDK
  // out of the cold-start path for non-billing requests.
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const body = await c.req.json().catch(() => ({}));
    const priceId = (body as { priceId?: string }).priceId;
    if (!priceId) return c.json({ error: "priceId required" }, 400);

    const [org] = await sql`
      SELECT stripe_customer_id, name FROM organizations WHERE id = ${orgId}
    `;
    if (!org) return c.json({ error: "org_not_found" }, 404);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: (org.stripeCustomerId as string) || undefined,
      client_reference_id: orgId,
      success_url: `${config.email.appUrl}/dashboard/billing?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.email.appUrl}/pricing`,
    });
    return c.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[billing] checkout failed", err);
    return c.json({ error: "checkout_failed", message: String(err) }, 500);
  }
});

billingRoutes.post("/portal", async (c) => {
  const orgId = c.get("orgId") as string;
  if (!stripeEnabled()) {
    return c.json({ error: "stripe_not_configured" }, 501);
  }
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const [org] = await sql`
      SELECT stripe_customer_id FROM organizations WHERE id = ${orgId}
    `;
    if (!org?.stripeCustomerId) {
      return c.json({ error: "no_stripe_customer" }, 400);
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId as string,
      return_url: `${config.email.appUrl}/dashboard/billing`,
    });
    return c.json({ url: portal.url });
  } catch (err) {
    console.error("[billing] portal failed", err);
    return c.json({ error: "portal_failed" }, 500);
  }
});

// Webhook needs raw body (signature verification) → must be mounted on a
// separate route group bypassing JSON parsing. Lives here for proximity;
// index.ts reroutes /api/billing/webhook before body parsers.
billingRoutes.post("/webhook", async (c) => {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: "stripe_not_configured" }, 501);
  }
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const sig = c.req.header("stripe-signature");
    if (!sig) return c.json({ error: "missing_signature" }, 400);
    const raw = await c.req.text();
    const event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );

    // Idempotency — bail if we've seen this event id already.
    const [seen] = await sql`SELECT id FROM stripe_events WHERE id = ${event.id}`;
    if (seen) return c.json({ ok: true, replay: true });

    await sql`
      INSERT INTO stripe_events (id, type, payload, org_id)
      VALUES (
        ${event.id}, ${event.type}, ${JSON.stringify(event)},
        ${(event.data.object as { client_reference_id?: string }).client_reference_id ?? null}
      )
    `;

    // Minimal subscription-state sync. Each handler is intentionally thin;
    // the full dunning/quota-overage pipeline lands when Stripe revenue
    // actually flows.
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        // Cast through unknown — Stripe v22 narrowed the public type for
        // Subscription so current_period_end is now declared on
        // Subscription.items.data[0].current_period_end. Fall back to the
        // legacy top-level field if present (covers older webhook
        // payloads still in flight) and emit a NULL otherwise.
        const sub = event.data.object as unknown as {
          id: string;
          customer: string;
          status: string;
          current_period_end?: number;
          trial_end?: number | null;
          items?: { data?: Array<{ current_period_end?: number }> };
        };
        const periodEnd =
          sub.current_period_end ??
          sub.items?.data?.[0]?.current_period_end ??
          null;
        await sql`
          UPDATE organizations
             SET stripe_subscription_id = ${sub.id},
                 subscription_status    = ${sub.status},
                 current_period_end     = ${
                   periodEnd ? sql`to_timestamp(${periodEnd})` : null
                 },
                 trial_ends_at          = ${
                   sub.trial_end ? sql`to_timestamp(${sub.trial_end})` : null
                 }
           WHERE stripe_customer_id = ${sub.customer}
        `;
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as { customer: string };
        await sql`
          UPDATE organizations
             SET subscription_status = 'canceled',
                 plan = 'free'
           WHERE stripe_customer_id = ${sub.customer}
        `;
        break;
      }
    }

    await sql`UPDATE stripe_events SET handled_at = now() WHERE id = ${event.id}`;
    return c.json({ ok: true });
  } catch (err) {
    console.error("[billing] webhook failed", err);
    return c.json({ error: "webhook_failed" }, 400);
  }
});
