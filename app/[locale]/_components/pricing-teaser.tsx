// app/[locale]/_components/pricing-teaser.tsx
//
// BJHUNT 2026 refonte — 3 plan cards in `gap-px` hairline grid,
// featured Pro plan distinguished by `border-2 var(--state-success)` (NOT
// a tinted background), price mono 36px, plan badge → StatusDot.
//
// Source of truth: backend/src/plans.ts. Keep in sync with /pricing.

"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { StatusDot } from "@/components/ui/status-dot";

interface Plan {
  idx: string;
  name: string;
  price: string;
  period: string;
  badge: string | null;
  features: string[];
  cta: string;
  href: "/beta" | "/contact";
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    idx: "P0",
    name: "Free",
    price: "$0",
    period: "/mo",
    badge: null,
    features: ["Démo chat (5 min)", "3 agents IA", "Sans API", "Support communauté"],
    cta: "Démarrer",
    href: "/beta",
  },
  {
    idx: "P1",
    name: "Pro",
    price: "$200",
    period: "/mo",
    badge: "POPULAIRE",
    features: ["5 scans / mois", "10 agents IA", "Vaccine loop + OPPLAN", "Exports JSON / PDF"],
    cta: "Essayer Pro",
    href: "/beta",
    featured: true,
  },
  {
    idx: "P2",
    name: "Enterprise",
    price: "$2,000",
    period: "/mo",
    badge: null,
    features: ["20 scans / mois", "17 agents IA", "API v1 + webhooks", "SSO + SLA dédié"],
    cta: "Contacter",
    href: "/contact",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export function PricingTeaser() {
  return (
    <section
      className="py-16 md:py-24"
      style={{ background: "var(--bjhunt-2026-bg)" }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
        <motion.header
          className="mb-10 max-w-2xl md:mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <p
            className="m-0 mb-4 font-mono uppercase"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-2026-text-muted)",
            }}
          >
            04 / Pricing
          </p>
          <h2
            className="m-0"
            style={{
              fontFamily: "var(--bjhunt-2026-font-display)",
              fontSize: "clamp(28px, 3vw, 36px)",
              fontWeight: 400,
              lineHeight: 1.11,
              letterSpacing: "-0.025em",
              color: "var(--bjhunt-2026-text)",
            }}
          >
            Commencez gratuitement.
            <br />
            <em
              className="not-italic"
              style={{ color: "var(--bjhunt-2026-text-secondary)" }}
            >
              Montez en puissance.
            </em>
          </h2>
        </motion.header>

        {/* 3-card hairline grid: `gap-px` over a border-color background */}
        <motion.div
          className="grid grid-cols-1 gap-px sm:grid-cols-1 md:grid-cols-3"
          style={{ background: "var(--bjhunt-2026-border)" }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {PLANS.map((plan) => (
            <motion.article
              key={plan.name}
              variants={fadeUp}
              className="relative flex flex-col gap-6 p-6 md:p-8"
              style={{
                background: "var(--bjhunt-2026-bg-surface)",
                // featured plan: 2px state-success border replacing 1px hairline
                ...(plan.featured
                  ? {
                      outline: "2px solid var(--state-success)",
                      outlineOffset: "-2px",
                      zIndex: 1,
                    }
                  : null),
              }}
            >
              <header className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <span
                    className="font-mono uppercase"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.18em",
                      color: "var(--bjhunt-2026-text-muted)",
                    }}
                  >
                    {plan.idx} · {plan.name}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      style={{
                        fontFamily: "var(--bjhunt-2026-font-mono)",
                        fontSize: 36,
                        fontWeight: 500,
                        letterSpacing: "-0.02em",
                        color: "var(--bjhunt-2026-text)",
                        lineHeight: 1,
                      }}
                    >
                      {plan.price}
                    </span>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 12,
                        color: "var(--bjhunt-2026-text-muted)",
                      }}
                    >
                      {plan.period}
                    </span>
                  </div>
                </div>

                {plan.badge ? (
                  <StatusDot state="success" label={plan.badge} mono />
                ) : null}
              </header>

              <ul
                className="m-0 flex flex-col gap-3 p-0"
                style={{ listStyle: "none" }}
              >
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="grid grid-cols-[12px_1fr] items-baseline gap-3"
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: "var(--bjhunt-2026-text-secondary)",
                      lineHeight: 1.55,
                    }}
                  >
                    <span
                      aria-hidden
                      className="font-mono"
                      style={{
                        fontSize: 11,
                        color: "var(--bjhunt-2026-text-muted)",
                      }}
                    >
                      ─
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 transition-colors"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: plan.featured
                    ? "var(--state-success)"
                    : "var(--bjhunt-2026-text)",
                  borderColor: plan.featured
                    ? "var(--state-success)"
                    : "var(--bjhunt-2026-border)",
                  background: "transparent",
                }}
              >
                {plan.cta}
                <span aria-hidden>→</span>
              </Link>
            </motion.article>
          ))}
        </motion.div>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="font-mono uppercase transition-colors"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-2026-text-muted)",
            }}
          >
            Voir tous les détails →
          </Link>
        </div>
      </div>
    </section>
  );
}
