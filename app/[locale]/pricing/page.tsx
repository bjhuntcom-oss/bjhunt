"use client";

import { useState, Fragment } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";

type CellValue = string;

interface FeatureRow {
  feature: string;
  free: CellValue;
  pro: CellValue;
  enterprise: CellValue;
}

interface PlanInfo {
  idx: string;
  key: string;
  featured: boolean;
  href: "/beta" | "/contact";
}

const PLANS: PlanInfo[] = [
  { idx: "P0", key: "free", featured: false, href: "/beta" },
  { idx: "P1", key: "pro", featured: true, href: "/beta" },
  { idx: "P2", key: "enterprise", featured: false, href: "/contact" },
];

const PLAN_HEADERS = ["free", "pro", "enterprise"] as const;

const FEATURE_GROUPS = [
  {
    categoryKey: "scans",
    rows: [
      { feature: "Scans per month", free: "--", pro: "5", enterprise: "20" },
      { feature: "OPPLAN Tracker", free: "--", pro: "check", enterprise: "check" },
      { feature: "Vaccine Loop", free: "--", pro: "check", enterprise: "check" },
    ],
  },
  {
    categoryKey: "agents",
    rows: [
      { feature: "AI Chat", free: "5 min", pro: "Unlimited", enterprise: "Unlimited" },
      { feature: "Agent selection", free: "3 agents", pro: "10 agents", enterprise: "17 agents" },
      { feature: "Real-time streaming", free: "check", pro: "check", enterprise: "check" },
    ],
  },
  {
    categoryKey: "intelligence",
    rows: [
      { feature: "Findings dashboard", free: "View only", pro: "Export", enterprise: "Export" },
      { feature: "CVE intelligence", free: "--", pro: "check", enterprise: "check" },
      { feature: "Knowledge graph", free: "--", pro: "--", enterprise: "check" },
    ],
  },
  {
    categoryKey: "reports",
    rows: [
      { feature: "Markdown export", free: "--", pro: "check", enterprise: "check" },
      { feature: "CSV export", free: "--", pro: "check", enterprise: "check" },
      { feature: "HackerOne format", free: "--", pro: "--", enterprise: "check" },
      { feature: "Executive summary", free: "--", pro: "--", enterprise: "check" },
    ],
  },
  {
    categoryKey: "api",
    rows: [
      { feature: "API v1 access", free: "--", pro: "--", enterprise: "check" },
      { feature: "Webhooks", free: "--", pro: "--", enterprise: "check" },
    ],
  },
  {
    categoryKey: "support",
    rows: [
      { feature: "Community", free: "check", pro: "check", enterprise: "check" },
      { feature: "Priority email", free: "--", pro: "check", enterprise: "check" },
      { feature: "Dedicated Slack", free: "--", pro: "--", enterprise: "check" },
    ],
  },
];

const FAQS = [
  { slug: "free", qKey: "faq1q", aKey: "faq1a" },
  { slug: "pro", qKey: "faq2q", aKey: "faq2a" },
  { slug: "enterprise", qKey: "faq3q", aKey: "faq3a" },
];

function MatrixCell({ value }: { value: CellValue }) {
  if (value === "check") return <span className="inline-flex justify-center"><StatusDot state="success" /></span>;
  if (value === "--") return <span className="font-mono text-bjhunt-text-disabled">─</span>;
  return <span className="font-mono tabular-nums text-bjhunt-text">{value}</span>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export default function PricingPage() {
  const t = useTranslations("pricing");

  return (
    <div className="relative pt-14" style={{ background: "var(--bjhunt-bg)" }}>
      {/* Hero */}
      <motion.section
        className="px-6 py-16 md:px-12 md:py-20 lg:px-16"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        <p className="mb-5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
          {t("heroEyebrow")}
        </p>
        <h1
          className="m-0 max-w-3xl font-display font-normal"
          style={{
            fontSize: "clamp(40px, 5vw, 60px)",
            lineHeight: 1.0,
            letterSpacing: "-0.025em",
            color: "var(--bjhunt-text)",
          }}
        >
          {t("heroTitle")}{" "}
          <span style={{ color: "var(--bjhunt-brand)" }}>{t("heroHighlight")}</span>
        </h1>
        <p className="mt-5 text-[16px] font-sans font-normal leading-[1.6] text-bjhunt-text-secondary max-w-[560px] m-0">
          {t("heroDescription")}
        </p>
      </motion.section>

      {/* Plan cards */}
      <section>
        <div className="grid grid-cols-1 gap-px md:grid-cols-3" style={{ background: "var(--bjhunt-border)" }}>
          {PLANS.map((plan) => (
            <article
              key={plan.key}
              className="relative flex flex-col gap-5 p-8"
              style={{ background: "var(--bjhunt-bg-surface)" }}
            >
              {plan.featured && (
                <span className="absolute right-5 top-5">
                  <StatusDot state="success" label={t(`${plan.key}.badge`)} />
                </span>
              )}
              <header className="flex flex-col gap-2">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted">
                  {plan.idx}
                </span>
                <h3 className="text-[20px] font-sans font-semibold leading-[1.4] tracking-[-0.01em] text-bjhunt-text m-0">
                  {t(`${plan.key}.name`)}
                </h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[34px] font-mono font-medium leading-none tracking-[-0.02em] text-bjhunt-text">
                    {t(`${plan.key}.price`)}
                  </span>
                  <span className="text-[12px] font-mono text-bjhunt-text-muted">{t(`${plan.key}.period`)}</span>
                </div>
                <p className="text-[13px] font-sans text-bjhunt-text-muted m-0">{t(`${plan.key}.description`)}</p>
              </header>
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {(t.raw(`${plan.key}.features`) as string[]).map((f: string) => (
                  <li key={f} className="flex items-start gap-3 text-[13px] font-sans text-bjhunt-text-secondary leading-[1.5]">
                    <span aria-hidden className="font-mono text-bjhunt-text-muted shrink-0">─</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {plan.featured ? (
                <Button asChild variant="state" state="success" size="md" className="mt-auto w-full">
                  <Link href={plan.href}>{t(`${plan.key}.cta`)}</Link>
                </Button>
              ) : (
                <Button asChild variant="ghost" size="md" className="mt-auto w-full">
                  <Link href={plan.href}>{t(`${plan.key}.cta`)}</Link>
                </Button>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Feature matrix — desktop */}
      <section className="hidden md:block" style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div className="px-6 py-16 md:px-12 lg:px-16">
          <p className="mb-5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
            {t("compareEyebrow")}
          </p>
          <h2
            className="mb-10 font-display font-semibold m-0"
            style={{
              fontSize: "clamp(22px, 2.4vw, 24px)",
              lineHeight: 1.33,
              letterSpacing: "-0.025em",
              color: "var(--bjhunt-text)",
            }}
          >
            {t("compareTitle")}{" "}
            <span style={{ color: "var(--bjhunt-brand)" }}>{t("compareHighlight")}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
                  <th scope="col" className="text-left font-mono font-semibold uppercase text-bjhunt-text-muted w-[40%] sticky left-0 px-4 py-3 text-[12px] tracking-[0.18em]" style={{ background: "var(--bjhunt-bg)", zIndex: 1 }}>
                    Feature
                  </th>
                  {PLAN_HEADERS.map((h) => (
                    <th key={h} scope="col" className="text-center font-mono font-semibold uppercase px-4 py-3 text-[12px] tracking-[0.18em]" style={{ color: h === "pro" ? "var(--bjhunt-brand)" : "var(--bjhunt-text-muted)" }}>
                      {t(`${h}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              {FEATURE_GROUPS.map((group) => (
                <tbody key={group.categoryKey}>
                  <tr style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
                    <th scope="colgroup" colSpan={4} className="text-left font-mono font-semibold uppercase text-bjhunt-text-muted sticky left-0 px-4 py-3 text-[12px] tracking-[0.18em]" style={{ background: "var(--bjhunt-bg)" }}>
                      {t(`categories.${group.categoryKey}`)}
                    </th>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.feature} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
                      <td className="font-sans text-bjhunt-text-secondary sticky left-0 px-4 py-3 text-[13px]" style={{ background: "var(--bjhunt-bg)" }}>
                        {row.feature}
                      </td>
                      <td className="text-center px-4 py-3 text-[13px]"><MatrixCell value={row.free} /></td>
                      <td className="text-center px-4 py-3 text-[13px]"><MatrixCell value={row.pro} /></td>
                      <td className="text-center px-4 py-3 text-[13px]"><MatrixCell value={row.enterprise} /></td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl px-6 py-16 md:px-12 md:py-20 lg:px-16">
        <p className="mb-5 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
          {t("faqEyebrow")}
        </p>
        <h2
          className="mb-10 font-display font-semibold m-0"
          style={{
            fontSize: "clamp(22px, 2.4vw, 24px)",
            lineHeight: 1.33,
            letterSpacing: "-0.025em",
            color: "var(--bjhunt-text)",
          }}
        >
          {t("faqTitle")}{" "}
          <span style={{ color: "var(--bjhunt-brand)" }}>{t("faqHighlight")}</span>
        </h2>

        <div style={{ borderTop: "1px solid var(--bjhunt-border)" }}>
          {FAQS.map((faq, i) => (
            <details
              key={faq.slug}
              className="group [&[open]_summary_svg]:rotate-180"
              style={{ borderBottom: i === FAQS.length - 1 ? undefined : "1px solid var(--bjhunt-border)" }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-sans font-semibold text-bjhunt-text text-[16px] leading-[1.5] transition-colors hover:bg-white/[0.02]">
                <span>{t(`contact.${faq.qKey}`)}</span>
                <ChevronDown aria-hidden className="h-4 w-4 shrink-0 transition-transform duration-300 text-bjhunt-text-muted" />
              </summary>
              <p className="m-0 max-w-2xl font-sans text-bjhunt-text-muted pb-4 text-[14px] font-normal leading-[1.65]">
                {t(`contact.${faq.aKey}`)}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Support CTA */}
      <section className="px-6 py-16 md:px-12 md:py-20 lg:px-16" style={{ borderTop: "1px solid var(--bjhunt-border)" }}>
        <div className="flex flex-col items-start gap-4 max-w-2xl">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">{t("supportEyebrow")}</p>
          <h2 className="font-display font-semibold text-[24px] leading-[1.33] tracking-[-0.025em] text-bjhunt-text m-0">{t("supportTitle")}</h2>
          <p className="font-sans text-bjhunt-text-muted text-[14px] leading-[1.5] m-0">{t("supportText")}</p>
          <Button asChild variant="ghost" size="md" className="mt-1">
            <Link href="/contact">{t("supportCta")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
