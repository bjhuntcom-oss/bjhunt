// app/[locale]/pricing/page.tsx
"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/section-label";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ScanRadarSVG } from "@/components/animations/scan-radar";
import { PriceBarsSVG } from "@/components/animations/price-bars";

const FEATURES_TABLE = [
  { feature: "Session",           free: "Demo 5 min",  pro: "Illimitée",        enterprise: "Illimitée" },
  { feature: "Scans / mois",     free: "—",            pro: "5",                enterprise: "20" },
  { feature: "Agents IA",        free: "—",            pro: "10",               enterprise: "17 (tous)" },
  { feature: "Chat",             free: "Demo 5 min",   pro: "Illimité",         enterprise: "Illimité" },
  { feature: "Export findings",  free: "—",            pro: "✓",                enterprise: "✓" },
  { feature: "Notifications",    free: "—",            pro: "✓",                enterprise: "✓" },
  { feature: "Clés API",         free: "—",            pro: "✓ (dashboard)",    enterprise: "✓ (API v1 complet)" },
  { feature: "API REST v1",      free: "—",            pro: "—",                enterprise: "✓" },
  { feature: "Webhooks",         free: "—",            pro: "—",                enterprise: "✓" },
  { feature: "Config agents",    free: "—",            pro: "—",                enterprise: "✓" },
  { feature: "Support",          free: "—",            pro: "Prioritaire",      enterprise: "Dédié" },
  { feature: "SLA",              free: "—",            pro: "—",                enterprise: "99.9%" },
];

const FAQS = [
  {
    q: "Comment fonctionne le plan Free ?",
    a: "Le plan Free offre une session démo de 5 minutes pour découvrir l'interface BJHUNT. Aucun scan, aucun agent, aucune API — juste un aperçu du chat IA.",
  },
  {
    q: "Quelle différence entre Pro et Enterprise pour l'API ?",
    a: "Le plan Pro permet de créer des clés API pour l'authentification dashboard. Seul le plan Enterprise donne accès à l'API REST v1 programmatique pour l'intégration CI/CD et l'automatisation.",
  },
  {
    q: "Puis-je passer à Pro à tout moment ?",
    a: "Oui, la migration est instantanée. Vos données et historiques sont conservés.",
  },
  {
    q: "Comment fonctionne Enterprise ?",
    a: "Enterprise inclut 20 scans/mois, les 17 agents IA, l'accès API v1 complet, les webhooks, la configuration custom des agents, et un support dédié avec SLA 99.9%. Contactez-nous pour démarrer.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

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
            { name: "Free",       price: "Gratuit",      sub: "Demo 5 minutes",                     badge: null,        cta: "Essai gratuit",     href: "/login",   featured: false },
            { name: "Pro",        price: "$200/mois",    sub: "5 scans · 10 agents · Chat illimité", badge: "Populaire", cta: "Souscrire",         href: "/contact", featured: true  },
            { name: "Enterprise", price: "$2,000/mois",  sub: "20 scans · 17 agents · API v1",       badge: "Entreprise", cta: "Contactez-nous",   href: "/contact", featured: false },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`p-10 flex flex-col gap-6 ${plan.featured ? "bg-[var(--bg-card)]" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">{plan.name}</p>
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

      {/* Tableau comparatif */}
      <section className="border-b border-[var(--border)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-8 py-4 text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">
                Fonctionnalité
              </th>
              {["Free", "Pro", "Enterprise"].map((p) => (
                <th key={p} className="px-8 py-4 text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES_TABLE.map((row, i) => (
              <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--bg-card)] transition-colors">
                <td className="px-8 py-3 text-[var(--text-muted)] text-[11px]">{row.feature}</td>
                {[row.free, row.pro, row.enterprise].map((val, j) => (
                  <td key={j} className="px-8 py-3 text-center text-[11px]">
                    {val === "✓" ? (
                      <span className="text-[var(--success)]">✓</span>
                    ) : val === "—" ? (
                      <span className="text-[var(--text-subtle)]">—</span>
                    ) : (
                      <span className="text-white">{val}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* FAQ */}
      <section className="py-20 px-8 md:px-12 max-w-2xl">
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="text-3xl font-black mt-4 mb-8 tracking-[-0.03em]">Questions fréquentes</h2>
        {FAQS.map((faq, i) => (
          <FAQItem key={i} q={faq.q} a={faq.a} />
        ))}
      </section>
    </div>
  );
}
