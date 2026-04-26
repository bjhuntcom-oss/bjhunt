// app/[locale]/_components/pricing-teaser.tsx
"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";

// Source of truth: backend/src/plans.ts. Keep in sync with /pricing page.
const PLANS = [
  {
    idx: "P0",
    name: "Free",
    price: "$0",
    period: "/mois",
    badge: null,
    features: ["Démo chat (5 min)", "3 agents IA", "Sans API", "Support communauté"],
    cta: "Démarrer",
    href: "/beta" as const,
    accent: "99,102,241",
  },
  {
    idx: "P1",
    name: "Pro",
    price: "$200",
    period: "/mois",
    badge: "Populaire",
    features: ["5 scans / mois", "10 agents IA", "Vaccine loop + OPPLAN", "Exports JSON / PDF"],
    cta: "Essayer Pro",
    href: "/beta" as const,
    accent: "99,102,241",
    featured: true,
  },
  {
    idx: "P2",
    name: "Enterprise",
    price: "$2,000",
    period: "/mois",
    badge: null,
    features: ["20 scans / mois", "17 agents IA", "API v1 + webhooks", "SSO + SLA dédié"],
    cta: "Contacter",
    href: "/contact" as const,
    accent: "100,210,255",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export function PricingTeaser() {
  return (
    <section className="px-8 py-28 md:px-12 lg:px-16">
      <motion.header
        className="mb-16 max-w-2xl"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
      >
        <p className="m-0 mb-6 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--bjhunt-text-subtle)]">
          04 / Pricing
        </p>
        <h2 className="m-0 font-extralight text-[clamp(40px,6vw,64px)] tracking-[-0.03em] leading-[1.0]">
          Commencez gratuitement.
          <br />
          <em className="not-italic font-extralight text-[var(--bjhunt-text-muted)]">
            Montez en puissance.
          </em>
        </h2>
      </motion.header>

      <motion.div
        className="grid grid-cols-1 gap-px md:grid-cols-3"
        style={{ background: "var(--bjhunt-border)" }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {PLANS.map((plan) => (
          <motion.article
            key={plan.name}
            variants={fadeUp}
            className="relative flex flex-col gap-7 p-9 backdrop-blur-2xl bg-[var(--bjhunt-bg)]"
            style={
              plan.featured
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(${plan.accent},0.04), rgba(${plan.accent},0.01))`,
                  }
                : undefined
            }
          >
            {plan.featured && (
              <span
                aria-hidden
                className="absolute left-0 top-0 bottom-0 w-px"
                style={{ background: `rgb(${plan.accent})`, opacity: 0.7 }}
              />
            )}
            <header className="flex items-start justify-between">
              <div>
                <p
                  className="m-0 mb-2 font-mono uppercase"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.32em",
                    color: "var(--bjhunt-text-disabled)",
                  }}
                >
                  {plan.idx} · {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontSize: 36,
                      fontWeight: 300,
                      letterSpacing: "-0.02em",
                      color: "var(--bjhunt-text)",
                    }}
                  >
                    {plan.price}
                  </span>
                  <span style={{ color: "var(--bjhunt-text-subtle)", fontSize: 12 }}>{plan.period}</span>
                </div>
              </div>
              {plan.badge && (
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.22em",
                    padding: "4px 10px",
                    color: `rgb(${plan.accent})`,
                    border: `1px solid rgba(${plan.accent},0.30)`,
                    background: `rgba(${plan.accent},0.08)`,
                  }}
                >
                  {plan.badge}
                </span>
              )}
            </header>

            <ul className="m-0 flex flex-col gap-3 p-0">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-baseline gap-3"
                  style={{
                    fontSize: 12,
                    fontWeight: 300,
                    color: "var(--bjhunt-text-muted)",
                    lineHeight: 1.55,
                    listStyle: "none",
                  }}
                >
                  <span
                    aria-hidden
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.18em",
                      color: "var(--bjhunt-text-disabled)",
                      flexShrink: 0,
                    }}
                  >
                    ─
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-3 font-mono uppercase transition-colors duration-200"
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                color: plan.featured ? "var(--bjhunt-text)" : "var(--bjhunt-text-muted)",
                border: plan.featured
                  ? "1px solid var(--bjhunt-border-strong)"
                  : "1px solid var(--bjhunt-border)",
                background: plan.featured ? "rgba(255,255,255,0.03)" : "transparent",
              }}
            >
              {plan.cta}
              <span aria-hidden>→</span>
            </Link>
          </motion.article>
        ))}
      </motion.div>

      <div className="mt-10 text-center">
        <Link
          href="/pricing"
          className="font-mono uppercase transition-colors hover:text-white"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "var(--bjhunt-text-subtle)",
          }}
        >
          Voir tous les détails →
        </Link>
      </div>
    </section>
  );
}
