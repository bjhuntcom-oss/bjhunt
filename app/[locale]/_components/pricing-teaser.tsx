// app/[locale]/_components/pricing-teaser.tsx
"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/section-label";

// Source of truth: backend/src/plans.ts (mirrored here for marketing display).
// Aligned with /pricing page so we never advertise prices/limits the platform
// cannot honor (Code de la consommation L121-1, Directive 2019/2161 Omnibus).
const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/mois",
    badge: null,
    features: ["Démo chat (5 min)", "3 agents IA", "Sans API", "Support communauté"],
    cta: "Démarrer",
    href: "/beta",
    variant: "secondary" as const,
  },
  {
    name: "Pro",
    price: "$200",
    period: "/mois",
    badge: "Populaire",
    features: ["5 scans / mois", "10 agents IA", "Vaccine loop + OPPLAN", "Exports JSON / PDF"],
    cta: "Essayer Pro",
    href: "/beta",
    variant: "primary" as const,
  },
  {
    name: "Enterprise",
    price: "$2,000",
    period: "/mois",
    badge: null,
    features: ["20 scans / mois", "17 agents IA", "API v1 + webhooks", "SSO + SLA dédié"],
    cta: "Contacter",
    href: "/contact",
    variant: "secondary" as const,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export function PricingTeaser() {
  return (
    <section className="py-24 px-8 md:px-12">
      <motion.div
        className="mb-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
      >
        <SectionLabel>Tarifs</SectionLabel>
        <h2 className="text-4xl font-black mt-4 tracking-[-0.03em]">
          Commencez gratuitement.<br />
          <span className="text-[var(--text-muted)]">Montez en puissance.</span>
        </h2>
      </motion.div>

      <motion.div
        className="grid md:grid-cols-3 gap-px bg-[var(--border)]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {PLANS.map((plan) => (
          <motion.div
            key={plan.name}
            variants={fadeUp}
            className={`bg-[var(--bg-card)] p-8 flex flex-col gap-6 ${
              plan.badge ? "border border-[var(--border-strong)]" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black font-mono">{plan.price}</span>
                  {plan.period && (
                    <span className="text-[var(--text-muted)] text-sm">{plan.period}</span>
                  )}
                </div>
              </div>
              {plan.badge && <Badge variant="success">{plan.badge}</Badge>}
            </div>

            <ul className="flex flex-col gap-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                  <span className="text-[var(--success)] text-[10px]">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Button asChild variant={plan.variant} className="mt-auto">
              <Link href={plan.href}>{plan.cta}</Link>
            </Button>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-6 text-center">
        <Link href="/pricing" className="text-[10px] text-[var(--text-muted)] hover:text-white uppercase tracking-[0.15em] transition-colors">
          Voir tous les détails →
        </Link>
      </div>
    </section>
  );
}
