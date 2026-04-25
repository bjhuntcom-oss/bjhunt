// app/[locale]/pricing/page.tsx
"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/section-label";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ScanRadarSVG } from "@/components/animations/scan-radar";
import { PriceBarsSVG } from "@/components/animations/price-bars";

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
      { feature: "Chat AI",              free: "5 min",    pro: "Illimite",  enterprise: "Illimite" },
      { feature: "Selection d'agents",   free: "3 agents", pro: "10 agents", enterprise: "17 agents" },
      { feature: "Streaming temps reel", free: "check",    pro: "check",     enterprise: "check" },
    ],
  },
  {
    category: "Scans",
    rows: [
      { feature: "Scans par mois",  free: "--",    pro: "5",     enterprise: "20" },
      { feature: "OPPLAN Tracker",   free: "--",    pro: "check", enterprise: "check" },
      { feature: "Vaccine Loop",     free: "--",    pro: "check", enterprise: "check" },
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

// ── FAQ ──────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Comment fonctionne le plan Free ?",
    a: "Le plan Free offre une session demo de 5 minutes pour decouvrir l'interface BJHUNT avec 3 agents de base. Aucun scan, aucune API -- juste un apercu du chat IA.",
  },
  {
    q: "Quelle difference entre Pro et Enterprise pour l'API ?",
    a: "Le plan Pro permet de creer des cles API pour l'authentification dashboard. Seul le plan Enterprise donne acces a l'API REST v1 programmatique pour l'integration CI/CD et l'automatisation.",
  },
  {
    q: "Puis-je passer a Pro a tout moment ?",
    a: "Oui, la migration est instantanee. Vos donnees et historiques sont conserves.",
  },
  {
    q: "Comment fonctionne Enterprise ?",
    a: "Enterprise inclut 20 scans/mois, les 17 agents IA, l'acces API v1 complet, les webhooks, la configuration custom des agents, le format HackerOne, le resume executif, et un support dedie avec Slack prive.",
  },
];

// ── Animations ──────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

// ── Cell renderer ───────────────────────────────────────────────────────

function CellContent({ value }: { value: CellValue }) {
  if (value === "check") {
    return <span className="text-[var(--success)]">&#10003;</span>;
  }
  if (value === "--") {
    return <span className="text-[var(--text-subtle)]">&mdash;</span>;
  }
  return <span className="text-white">{value}</span>;
}

// ── FAQ item ────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="flex items-center justify-between w-full py-4 text-left border-b border-[var(--border)] group">
        <span className="text-sm font-medium text-white group-hover:text-white/80">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden py-3">
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{a}</p>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

// ── Crown icon ──────────────────────────────────────────────────────────

function CrownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 17L4 8L8 12L12 4L16 12L20 8L22 17H2Z" fill="#FFD700" stroke="#FFD700" strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="2" y="17" width="20" height="3" rx="1" fill="#FFD700"/>
      <circle cx="5" cy="20" r="1" fill="#0a0a0a"/>
      <circle cx="12" cy="20" r="1" fill="#0a0a0a"/>
      <circle cx="19" cy="20" r="1" fill="#0a0a0a"/>
    </svg>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="pt-14">
      {/* Hero */}
      <motion.section
        className="border-b border-[var(--border)] grid lg:grid-cols-2"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        <div className="py-20 px-8 md:px-12">
          <SectionLabel>Tarifs</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black mt-4 tracking-[-0.03em]">
            Tarifs simples.<br />
            <span className="text-[var(--text-muted)]">Sans surprise.</span>
          </h1>
        </div>
        <div className="hidden lg:flex items-center justify-center border-l border-[var(--border)] p-12 gap-8">
          <ScanRadarSVG className="w-32 h-32 opacity-70" />
          <PriceBarsSVG className="w-28 h-24 opacity-70" />
        </div>
      </motion.section>

      {/* Plans */}
      <section className="border-b border-[var(--border)]">
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
          {[
            {
              name: "Free",
              price: "Gratuit",
              sub: "Demo 5 min -- 3 agents",
              badge: null,
              icon: null,
              cta: "Essai gratuit",
              href: "/login",
              featured: false,
            },
            {
              // ENG-P0-3: Stripe checkout n'est pas encore livré (W10).
              // CTA renommé "Demander un accès" pour ne pas promettre un
              // self-checkout instantané qu'on ne peut pas honorer.
              name: "Pro",
              price: "$200/mois",
              sub: "5 scans -- 10 agents -- Chat illimite",
              badge: "Populaire",
              icon: "approved",
              cta: "Demander un accès",
              href: "/contact",
              featured: true,
            },
            {
              name: "Enterprise",
              price: "$2,000/mois",
              sub: "20 scans -- 17 agents -- API v1",
              badge: "Entreprise",
              icon: "crown",
              cta: "Contactez-nous",
              href: "/contact",
              featured: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`p-10 flex flex-col gap-6 ${plan.featured ? "bg-[var(--bg-card)]" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {plan.icon === "crown" && <CrownIcon />}
                    {plan.icon === "approved" && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="#00cc8a" strokeWidth="1.5"/>
                        <path d="M8 12L11 15L16 9" stroke="#00cc8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{plan.name}</p>
                  </div>
                  <p className="text-3xl font-black font-mono">{plan.price}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{plan.sub}</p>
                </div>
                {plan.badge && <Badge variant="success">{plan.badge}</Badge>}
              </div>
              <Button asChild variant={plan.featured ? "primary" : "secondary"}>
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Feature matrix table */}
      <section className="border-b border-[var(--border)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-8 py-4 text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium w-[40%]">
                Fonctionnalite
              </th>
              <th className="px-8 py-4 text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium text-center">
                Free
              </th>
              <th className="px-8 py-4 text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium text-center">
                Pro
              </th>
              <th className="px-8 py-4 text-[9px] uppercase tracking-[0.2em] font-medium text-center">
                <span className="flex items-center justify-center gap-1.5 text-[var(--text-muted)]">
                  <CrownIcon />
                  Enterprise
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_GROUPS.map((group) => (
              <Fragment key={group.category}>
                {/* Category header row */}
                <tr className="border-b border-[var(--border)]">
                  <td
                    colSpan={4}
                    className="px-8 py-3 text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-white bg-[var(--bg-card)]"
                  >
                    {group.category}
                  </td>
                </tr>

                {/* Feature rows */}
                {group.rows.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-[var(--border)] hover:bg-[var(--bg-card)] transition-colors"
                  >
                    <td className="px-8 py-3 text-[var(--text-muted)] text-[11px]">
                      {row.feature}
                    </td>
                    <td className="px-8 py-3 text-center text-[11px]">
                      <CellContent value={row.free} />
                    </td>
                    <td className="px-8 py-3 text-center text-[11px]">
                      <CellContent value={row.pro} />
                    </td>
                    <td className="px-8 py-3 text-center text-[11px]">
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
      <section className="border-b border-[var(--border)]">
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
          {[
            { name: "Free",       cta: "Essai gratuit",   href: "/login",   featured: false },
            { name: "Pro",        cta: "Demander un accès", href: "/contact", featured: true  },
            { name: "Enterprise", cta: "Contactez-nous",  href: "/contact", featured: false },
          ].map((plan) => (
            <div key={plan.name} className="p-6 flex items-center justify-center">
              <Button asChild variant={plan.featured ? "primary" : "secondary"} size="lg">
                <Link href={plan.href}>
                  {plan.cta}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-8 md:px-12 max-w-2xl">
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="text-3xl font-black mt-4 mb-8 tracking-[-0.03em]">Questions frequentes</h2>
        {FAQS.map((faq, i) => (
          <FAQItem key={i} q={faq.q} a={faq.a} />
        ))}
      </section>
    </div>
  );
}
