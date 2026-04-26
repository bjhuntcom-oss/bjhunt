// app/[locale]/pricing/page.tsx
"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";

// ── Feature matrix data ──────────────────────────────────────────────────

type CellValue = string;

interface FeatureRow {
  feature: string;
  free: CellValue;
  pro: CellValue;
  enterprise: CellValue;
}

interface FeatureGroup {
  category: string;
  rows: FeatureRow[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    category: "Chat & Agents",
    rows: [
      { feature: "Chat AI",              free: "5 min",    pro: "Illimité",  enterprise: "Illimité" },
      { feature: "Sélection d'agents",   free: "3 agents", pro: "10 agents", enterprise: "17 agents" },
      { feature: "Streaming temps réel", free: "check",    pro: "check",     enterprise: "check" },
    ],
  },
  {
    category: "Scans",
    rows: [
      { feature: "Scans par mois", free: "--",    pro: "5",     enterprise: "20" },
      { feature: "OPPLAN Tracker", free: "--",    pro: "check", enterprise: "check" },
      { feature: "Vaccine Loop",   free: "--",    pro: "check", enterprise: "check" },
    ],
  },
  {
    category: "Intelligence",
    rows: [
      { feature: "Findings Dashboard", free: "Vue seule", pro: "Export",  enterprise: "Export" },
      { feature: "CVE Intelligence",   free: "--",        pro: "check",   enterprise: "check" },
      { feature: "Skill Catalog",      free: "--",        pro: "check",   enterprise: "check" },
      { feature: "Knowledge Graph",    free: "--",        pro: "--",      enterprise: "check" },
    ],
  },
  {
    category: "Outils",
    rows: [
      { feature: "Tool Playground",   free: "--", pro: "--", enterprise: "check" },
      { feature: "Cloud Wizard",      free: "--", pro: "--", enterprise: "check" },
      { feature: "AD Chain Builder",  free: "--", pro: "--", enterprise: "check" },
    ],
  },
  {
    category: "Rapports",
    rows: [
      { feature: "Export Markdown",    free: "--", pro: "check", enterprise: "check" },
      { feature: "Export CSV",         free: "--", pro: "check", enterprise: "check" },
      { feature: "HackerOne Format",   free: "--", pro: "--",    enterprise: "check" },
      { feature: "Executive Summary",  free: "--", pro: "--",    enterprise: "check" },
    ],
  },
  {
    category: "API",
    rows: [
      { feature: "API v1 Access", free: "--", pro: "--", enterprise: "check" },
      { feature: "Webhooks",      free: "--", pro: "--", enterprise: "check" },
    ],
  },
  {
    category: "Support",
    rows: [
      { feature: "Community",       free: "check", pro: "check", enterprise: "check" },
      { feature: "Priority Email",  free: "--",    pro: "check", enterprise: "check" },
      { feature: "Dedicated Slack", free: "--",    pro: "--",    enterprise: "check" },
    ],
  },
];

const FAQS = [
  {
    q: "Comment fonctionne le plan Free ?",
    a: "Le plan Free offre une session démo de 5 minutes pour découvrir l'interface BJHUNT avec 3 agents de base. Aucun scan, aucune API — juste un aperçu du chat IA.",
  },
  {
    q: "Quelle différence entre Pro et Enterprise pour l'API ?",
    a: "Le plan Pro permet de créer des clés API pour l'authentification dashboard. Seul le plan Enterprise donne accès à l'API REST v1 programmatique pour l'intégration CI/CD.",
  },
  {
    q: "Puis-je passer à Pro à tout moment ?",
    a: "Oui, la migration est instantanée. Vos données et historiques sont conservés.",
  },
  {
    q: "Comment fonctionne Enterprise ?",
    a: "Enterprise inclut 20 scans/mois, les 17 agents IA, l'accès API v1 complet, les webhooks, la configuration custom des agents, le format HackerOne, le résumé exécutif, et un support dédié avec Slack privé.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

function CellContent({ value }: { value: CellValue }) {
  if (value === "check") {
    return <span style={{ color: "#30D158" }}>✓</span>;
  }
  if (value === "--") {
    return <span style={{ color: "var(--bjhunt-text-disabled)" }}>—</span>;
  }
  return <span style={{ color: "var(--bjhunt-text)" }}>{value}</span>;
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger
        className="group flex w-full items-center justify-between py-5 text-left"
        style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
      >
        <span style={{ fontSize: 15, fontWeight: 300, color: "var(--bjhunt-text)" }}>{q}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--bjhunt-text-subtle)" }}
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden py-4">
        <p
          className="m-0 max-w-2xl"
          style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.65, color: "var(--bjhunt-text-muted)" }}
        >
          {a}
        </p>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

const PLANS = [
  {
    idx: "P0",
    name: "Free",
    price: "Gratuit",
    sub: "Démo 5 min · 3 agents",
    badge: null,
    cta: "Essai gratuit",
    href: "/login" as const,
    featured: false,
    accent: "99,102,241",
  },
  {
    idx: "P1",
    name: "Pro",
    price: "$200/mois",
    sub: "5 scans · 10 agents · Chat illimité",
    badge: "Populaire",
    cta: "Demander un accès",
    href: "/contact" as const,
    featured: true,
    accent: "99,102,241",
  },
  {
    idx: "P2",
    name: "Enterprise",
    price: "$2,000/mois",
    sub: "20 scans · 17 agents · API v1",
    badge: "Entreprise",
    cta: "Contactez-nous",
    href: "/contact" as const,
    featured: false,
    accent: "100,210,255",
  },
];

export default function PricingPage() {
  return (
    <div className="relative pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 80% 0%, rgba(99,102,241,0.06), transparent 55%)",
        }}
      />

      {/* Hero */}
      <motion.section
        className="relative z-10 px-8 py-24 md:px-12 lg:px-16"
        style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        <p
          className="m-0 mb-6 font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--bjhunt-text-subtle)" }}
        >
          04 / Pricing
        </p>
        <h1
          className="m-0 max-w-4xl"
          style={{
            fontSize: "clamp(48px, 8vw, 96px)",
            fontWeight: 200,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
          }}
        >
          Tarifs simples<em className="not-italic" style={{ color: "var(--bjhunt-text-muted)", fontWeight: 200 }}>.</em>
          <br />
          <em className="not-italic" style={{ color: "var(--bjhunt-text-muted)", fontWeight: 200 }}>
            Sans surprise.
          </em>
        </h1>
        <p
          className="mt-6 max-w-xl"
          style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.6, color: "var(--bjhunt-text-muted)" }}
        >
          Un plan par stade : démo gratuite, équipe Pro, déploiement Enterprise. Migration instantanée entre les paliers.
        </p>
      </motion.section>

      {/* Plans */}
      <section className="relative z-10" style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div className="grid grid-cols-1 gap-px md:grid-cols-3" style={{ background: "var(--bjhunt-border)" }}>
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className="relative flex flex-col gap-7 p-10"
              style={{
                background: plan.featured
                  ? `linear-gradient(180deg, rgba(${plan.accent},0.04), rgba(${plan.accent},0.01)), var(--bjhunt-bg)`
                  : "var(--bjhunt-bg)",
              }}
            >
              {plan.featured && (
                <span
                  aria-hidden
                  className="absolute left-0 top-0 bottom-0 w-px"
                  style={{ background: `rgb(${plan.accent})`, opacity: 0.7 }}
                />
              )}
              <header>
                <p
                  className="m-0 mb-2 font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: "0.32em", color: "var(--bjhunt-text-disabled)" }}
                >
                  {plan.idx} · {plan.name}
                </p>
                <p
                  className="m-0"
                  style={{
                    fontFamily: "var(--bjhunt-font-mono)",
                    fontSize: 36,
                    fontWeight: 300,
                    letterSpacing: "-0.02em",
                    color: "var(--bjhunt-text)",
                  }}
                >
                  {plan.price}
                </p>
                <p
                  className="m-0 mt-2"
                  style={{ fontSize: 12, fontWeight: 300, color: "var(--bjhunt-text-muted)" }}
                >
                  {plan.sub}
                </p>
              </header>
              {plan.badge && (
                <span
                  className="inline-flex w-max font-mono uppercase"
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
            </article>
          ))}
        </div>
      </section>

      {/* Feature matrix */}
      <section
        className="relative z-10 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
      >
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
              <th
                className="px-8 py-5 text-left font-mono uppercase"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.32em",
                  color: "var(--bjhunt-text-subtle)",
                  fontWeight: 400,
                  width: "40%",
                }}
              >
                Fonctionnalité
              </th>
              <th
                className="px-8 py-5 text-center font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: "0.32em", color: "var(--bjhunt-text-subtle)", fontWeight: 400 }}
              >
                Free
              </th>
              <th
                className="px-8 py-5 text-center font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: "0.32em", color: "var(--bjhunt-text)", fontWeight: 400 }}
              >
                Pro
              </th>
              <th
                className="px-8 py-5 text-center font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: "0.32em", color: "var(--bjhunt-text-subtle)", fontWeight: 400 }}
              >
                Enterprise
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_GROUPS.map((group) => (
              <Fragment key={group.category}>
                <tr style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
                  <td
                    colSpan={4}
                    className="px-8 py-3 font-mono uppercase"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.32em",
                      color: "var(--bjhunt-text-muted)",
                      background: "rgba(255,255,255,0.015)",
                    }}
                  >
                    {group.category}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr
                    key={row.feature}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
                  >
                    <td
                      className="px-8 py-3.5"
                      style={{ fontSize: 13, fontWeight: 300, color: "var(--bjhunt-text-muted)" }}
                    >
                      {row.feature}
                    </td>
                    <td className="px-8 py-3.5 text-center" style={{ fontSize: 12, fontWeight: 300 }}>
                      <CellContent value={row.free} />
                    </td>
                    <td className="px-8 py-3.5 text-center" style={{ fontSize: 12, fontWeight: 300 }}>
                      <CellContent value={row.pro} />
                    </td>
                    <td className="px-8 py-3.5 text-center" style={{ fontSize: 12, fontWeight: 300 }}>
                      <CellContent value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10" style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div
          className="grid grid-cols-1 gap-px md:grid-cols-3"
          style={{ background: "var(--bjhunt-border)" }}
        >
          {[
            { name: "Free",       cta: "Essai gratuit",     href: "/login"   as const, featured: false },
            { name: "Pro",        cta: "Demander un accès", href: "/contact" as const, featured: true  },
            { name: "Enterprise", cta: "Contactez-nous",    href: "/contact" as const, featured: false },
          ].map((plan) => (
            <div
              key={plan.name}
              className="flex items-center justify-center p-8"
              style={{ background: "var(--bjhunt-bg)" }}
            >
              <Link
                href={plan.href}
                className="inline-flex items-center gap-2 px-5 py-3 font-mono uppercase transition-colors duration-200"
                style={{
                  fontSize: 11,
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
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-3xl px-8 py-24 md:px-12 lg:px-16">
        <p
          className="m-0 mb-6 font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--bjhunt-text-subtle)" }}
        >
          08 / FAQ
        </p>
        <h2
          className="m-0 mb-10"
          style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 200, letterSpacing: "-0.03em", lineHeight: 1.0 }}
        >
          Questions fréquentes<em className="not-italic" style={{ color: "var(--bjhunt-text-muted)", fontWeight: 200 }}>.</em>
        </h2>
        <div style={{ borderTop: "1px solid var(--bjhunt-border)" }}>
          {FAQS.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>
    </div>
  );
}
