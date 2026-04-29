// app/[locale]/pricing/page.tsx
"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Fragment } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";

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

interface FAQ {
  slug: string;
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    slug: "free-plan",
    q: "Comment fonctionne le plan Free ?",
    a: "Le plan Free offre une session démo de 5 minutes pour découvrir l'interface BJHUNT avec 3 agents de base. Aucun scan, aucune API — juste un aperçu du chat IA.",
  },
  {
    slug: "pro-vs-enterprise-api",
    q: "Quelle différence entre Pro et Enterprise pour l'API ?",
    a: "Le plan Pro permet de créer des clés API pour l'authentification dashboard. Seul le plan Enterprise donne accès à l'API REST v1 programmatique pour l'intégration CI/CD.",
  },
  {
    slug: "upgrade-anytime",
    q: "Puis-je passer à Pro à tout moment ?",
    a: "Oui, la migration est instantanée. Vos données et historiques sont conservés.",
  },
  {
    slug: "enterprise-details",
    q: "Comment fonctionne Enterprise ?",
    a: "Enterprise inclut 20 scans/mois, les 17 agents IA, l'accès API v1 complet, les webhooks, la configuration custom des agents, le format HackerOne, le résumé exécutif, et un support dédié avec Slack privé.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

// ── Plan data ────────────────────────────────────────────────────────────

interface Plan {
  idx: string;
  tier: "FREE" | "PRO" | "ENT";
  name: string;
  price: string;
  period: string;
  sub: string;
  features: string[];
  cta: string;
  href: "/beta" | "/contact" | "/beta";
  featured: boolean;
}

const PLANS: Plan[] = [
  {
    idx: "P0",
    tier: "FREE",
    name: "Free",
    price: "$0",
    period: "Démo 5 min",
    sub: "Découvrir l'interface BJHUNT",
    features: [
      "Chat IA — 5 minutes",
      "3 agents de base",
      "Streaming temps réel",
      "Findings (vue seule)",
      "Support communautaire",
    ],
    cta: "Essai gratuit",
    href: "/beta",
    featured: false,
  },
  {
    idx: "P1",
    tier: "PRO",
    name: "Pro",
    price: "$200",
    period: "/ mois",
    sub: "Équipes red team & pentesters",
    features: [
      "Chat IA illimité",
      "10 agents IA",
      "5 scans / mois",
      "OPPLAN Tracker + Vaccine Loop",
      "Export Markdown & CSV",
      "Priority email support",
    ],
    cta: "Demander un accès",
    href: "/contact",
    featured: true,
  },
  {
    idx: "P2",
    tier: "ENT",
    name: "Enterprise",
    price: "$2,000",
    period: "/ mois",
    sub: "Déploiement large échelle",
    features: [
      "Tout du plan Pro",
      "17 agents IA",
      "20 scans / mois",
      "API v1 + Webhooks",
      "Knowledge Graph & Tool Playground",
      "Format HackerOne + Executive Summary",
      "Slack dédié",
    ],
    cta: "Contactez-nous",
    href: "/contact",
    featured: false,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────

function MatrixCell({ value }: { value: CellValue }) {
  if (value === "check") {
    return (
      <span className="inline-flex justify-center">
        <StatusDot state="success" />
      </span>
    );
  }
  if (value === "--") {
    return (
      <span
        className="font-mono"
        style={{ color: "var(--bjhunt-text-disabled)" }}
      >
        ─
      </span>
    );
  }
  // Numeric or labeled value — mono, tabular-nums, white
  return (
    <span
      className="font-mono tabular-nums"
      style={{ color: "var(--bjhunt-text)" }}
    >
      {value}
    </span>
  );
}

function MobileMatrixCell({ value }: { value: CellValue }) {
  if (value === "check") {
    return <StatusDot state="success" />;
  }
  if (value === "--") {
    return (
      <span
        className="font-mono"
        style={{ color: "var(--bjhunt-text-disabled)" }}
      >
        ─
      </span>
    );
  }
  return (
    <span
      className="font-mono tabular-nums text-[12px]"
      style={{ color: "var(--bjhunt-text)" }}
    >
      {value}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="relative pt-14">
      {/* ── Hero ──────────────────────────────────────────── */}
      <motion.section
        className="relative z-10 px-6 py-20 md:px-12 md:py-24 lg:px-16"
        style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        <p
          className="m-0 mb-6 font-mono font-semibold uppercase"
          style={{
            fontSize: 12,
            letterSpacing: "0.18em",
            color: "var(--bjhunt-text-muted)",
          }}
        >
          04 / Tarifs
        </p>
        <h1
          className="m-0 max-w-4xl font-display font-normal"
          style={{
            fontSize: "clamp(40px, 5vw, 60px)",
            lineHeight: 1.0,
            letterSpacing: "-0.011em",
            color: "var(--bjhunt-text)",
          }}
        >
          Tarifs simples.
          <br />
          <span style={{ color: "var(--bjhunt-text-muted)" }}>
            Sans surprise.
          </span>
        </h1>
        <p
          className="mt-6 font-sans"
          style={{
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.6,
            color: "var(--bjhunt-text-secondary)",
            maxWidth: 560,
          }}
        >
          Un plan par stade : démo gratuite, équipe Pro, déploiement Enterprise.
          Migration instantanée entre les paliers.
        </p>
      </motion.section>

      {/* ── Plan grid ─────────────────────────────────────── */}
      <section
        className="relative z-10"
        style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
      >
        <div
          className="grid grid-cols-1 gap-px md:grid-cols-3"
          style={{ background: "var(--bjhunt-border)" }}
        >
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className="relative flex flex-col gap-6 p-8"
              style={{
                background: "var(--bjhunt-bg-surface)",
                borderLeft: plan.featured
                  ? "2px solid var(--state-success)"
                  : undefined,
              }}
            >
              {plan.featured && (
                <span className="absolute right-6 top-6">
                  <StatusDot state="success" label="POPULAIRE" />
                </span>
              )}

              <header className="flex flex-col gap-3">
                <p
                  className="m-0 font-mono font-semibold uppercase"
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.18em",
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  {plan.idx} / {plan.tier}
                </p>
                <h3
                  className="m-0 font-sans font-semibold"
                  style={{
                    fontSize: 20,
                    lineHeight: 1.4,
                    letterSpacing: "-0.01em",
                    color: "var(--bjhunt-text)",
                  }}
                >
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: 36,
                      fontWeight: 400,
                      lineHeight: 1.0,
                      letterSpacing: "-0.02em",
                      color: "var(--bjhunt-text)",
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    className="font-sans"
                    style={{
                      fontSize: 13,
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    {plan.period}
                  </span>
                </div>
                <p
                  className="m-0 font-sans"
                  style={{
                    fontSize: 13,
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  {plan.sub}
                </p>
              </header>

              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3"
                  >
                    <span
                      aria-hidden
                      className="font-mono shrink-0"
                      style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "var(--bjhunt-text-disabled)",
                      }}
                    >
                      ─
                    </span>
                    <span
                      className="font-sans"
                      style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "var(--bjhunt-text-muted)",
                      }}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-2">
                {plan.featured ? (
                  <Button
                    asChild
                    variant="state"
                    state="success"
                    size="md"
                    className="w-full"
                  >
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    size="md"
                    className="w-full"
                  >
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Feature matrix — desktop table (md+) ──────────── */}
      <section
        className="relative z-10 hidden md:block"
        style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
      >
        <div className="px-6 py-16 md:px-12 lg:px-16">
          <p
            className="m-0 mb-6 font-mono font-semibold uppercase"
            style={{
              fontSize: 12,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-text-muted)",
            }}
          >
            03 / Comparatif
          </p>
          <h2
            className="m-0 mb-10 font-display font-semibold"
            style={{
              fontSize: "clamp(22px, 2.4vw, 24px)",
              lineHeight: 1.33,
              letterSpacing: "-0.025em",
              color: "var(--bjhunt-text)",
            }}
          >
            Comparatif détaillé
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
                  <th
                    scope="col"
                    className="text-left font-mono font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: 12,
                      letterSpacing: "0.18em",
                      color: "var(--bjhunt-text-muted)",
                      width: "40%",
                      position: "sticky",
                      left: 0,
                      background: "var(--bjhunt-bg)",
                      zIndex: 1,
                    }}
                  >
                    Fonctionnalité
                  </th>
                  <th
                    scope="col"
                    className="text-center font-mono font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: 12,
                      letterSpacing: "0.18em",
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    Free
                  </th>
                  <th
                    scope="col"
                    className="text-center font-mono font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: 12,
                      letterSpacing: "0.18em",
                      color: "var(--state-success)",
                    }}
                  >
                    Pro
                  </th>
                  <th
                    scope="col"
                    className="text-center font-mono font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: 12,
                      letterSpacing: "0.18em",
                      color: "var(--bjhunt-text-muted)",
                    }}
                  >
                    Enterprise
                  </th>
                </tr>
              </thead>
              {FEATURE_GROUPS.map((group) => (
                <tbody key={group.category}>
                  <tr style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
                    <th
                      scope="colgroup"
                      colSpan={4}
                      className="text-left font-mono font-semibold uppercase"
                      style={{
                        padding: "12px 16px",
                        fontSize: 12,
                        letterSpacing: "0.18em",
                        color: "var(--bjhunt-text-muted)",
                        background: "var(--bjhunt-bg)",
                        position: "sticky",
                        left: 0,
                      }}
                    >
                      {group.category}
                    </th>
                  </tr>
                  {group.rows.map((row) => (
                    <tr
                      key={row.feature}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom: "1px solid var(--bjhunt-border)",
                      }}
                    >
                      <td
                        className="font-sans"
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          color: "var(--bjhunt-text-secondary)",
                          position: "sticky",
                          left: 0,
                          background: "var(--bjhunt-bg)",
                        }}
                      >
                        {row.feature}
                      </td>
                      <td
                        className="text-center"
                        style={{ padding: "12px 16px", fontSize: 13 }}
                      >
                        <MatrixCell value={row.free} />
                      </td>
                      <td
                        className="text-center"
                        style={{ padding: "12px 16px", fontSize: 13 }}
                      >
                        <MatrixCell value={row.pro} />
                      </td>
                      <td
                        className="text-center"
                        style={{ padding: "12px 16px", fontSize: 13 }}
                      >
                        <MatrixCell value={row.enterprise} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </div>
      </section>

      {/* ── Feature matrix — mobile stacked cards (<md) ──── */}
      <section
        className="relative z-10 md:hidden"
        style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
      >
        <div className="px-6 py-16">
          <p
            className="m-0 mb-6 font-mono font-semibold uppercase"
            style={{
              fontSize: 12,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-text-muted)",
            }}
          >
            03 / Comparatif
          </p>
          <h2
            className="m-0 mb-8 font-display font-semibold"
            style={{
              fontSize: 22,
              lineHeight: 1.33,
              letterSpacing: "-0.025em",
              color: "var(--bjhunt-text)",
            }}
          >
            Comparatif détaillé
          </h2>

          <div className="flex flex-col gap-8">
            {FEATURE_GROUPS.map((group) => (
              <div
                key={group.category}
                className="flex flex-col"
                style={{
                  border: "1px solid var(--bjhunt-border)",
                  borderRadius: "var(--bjhunt-radius-md)",
                  background: "var(--bjhunt-bg-surface)",
                }}
              >
                <p
                  className="m-0 font-mono font-semibold uppercase"
                  style={{
                    padding: "12px 16px",
                    fontSize: 12,
                    letterSpacing: "0.18em",
                    color: "var(--bjhunt-text-muted)",
                    borderBottom: "1px solid var(--bjhunt-border)",
                  }}
                >
                  {group.category}
                </p>
                {group.rows.map((row, idx) => (
                  <div
                    key={row.feature}
                    style={{
                      padding: "12px 16px",
                      borderBottom:
                        idx === group.rows.length - 1
                          ? undefined
                          : "1px solid var(--bjhunt-border)",
                    }}
                  >
                    <p
                      className="m-0 mb-3 font-sans"
                      style={{
                        fontSize: 13,
                        color: "var(--bjhunt-text-secondary)",
                      }}
                    >
                      {row.feature}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["free", "pro", "enterprise"] as const).map((tier) => (
                        <div
                          key={tier}
                          className="flex flex-col items-start gap-1.5"
                          style={{
                            padding: "8px 10px",
                            border: "1px solid var(--bjhunt-border)",
                            borderRadius: "var(--bjhunt-radius-sm)",
                          }}
                        >
                          <span
                            className="font-mono font-semibold uppercase"
                            style={{
                              fontSize: 10,
                              letterSpacing: "0.18em",
                              color: "var(--bjhunt-text-muted)",
                            }}
                          >
                            {tier === "enterprise" ? "Ent" : tier}
                          </span>
                          <MobileMatrixCell value={row[tier]} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="relative z-10 max-w-3xl px-6 py-20 md:px-12 md:py-24 lg:px-16">
        <p
          className="m-0 mb-6 font-mono font-semibold uppercase"
          style={{
            fontSize: 12,
            letterSpacing: "0.18em",
            color: "var(--bjhunt-text-muted)",
          }}
        >
          04 / FAQ
        </p>
        <h2
          className="m-0 mb-10 font-display font-semibold"
          style={{
            fontSize: "clamp(22px, 2.4vw, 24px)",
            lineHeight: 1.33,
            letterSpacing: "-0.025em",
            color: "var(--bjhunt-text)",
          }}
        >
          Questions fréquentes
        </h2>

        <div
          style={{
            borderTop: "1px solid var(--bjhunt-border)",
            borderBottom: "1px solid var(--bjhunt-border)",
          }}
        >
          {FAQS.map((faq, i) => (
            <Fragment key={faq.slug}>
              <details
                id={`faq-${faq.slug}`}
                className="group [&[open]_summary_svg]:rotate-180"
                style={{
                  borderBottom:
                    i === FAQS.length - 1
                      ? undefined
                      : "1px solid var(--bjhunt-border)",
                }}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-sans font-semibold transition-colors hover:bg-white/[0.02]"
                  style={{
                    fontSize: 16,
                    lineHeight: 1.5,
                    color: "var(--bjhunt-text)",
                  }}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    aria-hidden
                    className="h-4 w-4 shrink-0 transition-transform duration-300"
                    style={{ color: "var(--bjhunt-text-muted)" }}
                  />
                </summary>
                <p
                  className="m-0 max-w-2xl font-sans"
                  style={{
                    padding: "0 0 16px 0",
                    fontSize: 14,
                    fontWeight: 400,
                    lineHeight: 1.65,
                    color: "var(--bjhunt-text-muted)",
                  }}
                >
                  {faq.a}
                </p>
              </details>
            </Fragment>
          ))}
        </div>
      </section>

      {/* ── Bottom support CTA ────────────────────────────── */}
      <section
        className="relative z-10 px-6 py-16 md:px-12 md:py-20 lg:px-16"
        style={{ borderTop: "1px solid var(--bjhunt-border)" }}
      >
        <div className="flex flex-col items-start gap-4 max-w-2xl">
          <p
            className="m-0 font-mono font-semibold uppercase"
            style={{
              fontSize: 12,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-text-muted)",
            }}
          >
            05 / Support
          </p>
          <h2
            className="m-0 font-display font-semibold"
            style={{
              fontSize: 24,
              lineHeight: 1.33,
              letterSpacing: "-0.025em",
              color: "var(--bjhunt-text)",
            }}
          >
            Une question ?
          </h2>
          <p
            className="m-0 font-sans"
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: "var(--bjhunt-text-muted)",
            }}
          >
            L'équipe BJHUNT répond sous 24h ouvrées sur les questions de
            tarification, de migration, et de déploiement Enterprise.
          </p>
          <div className="mt-2">
            <Button asChild variant="ghost" size="md">
              <Link href="/contact">Contactez-nous</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
