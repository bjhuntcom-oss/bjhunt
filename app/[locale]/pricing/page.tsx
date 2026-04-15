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
  { feature: "Scans / mois",     free: "5",       pro: "Illimités",  enterprise: "Illimités" },
  { feature: "Profondeur scan",  free: "Basique", pro: "Complète",   enterprise: "Complète + Custom" },
  { feature: "CVE detection",    free: "✓",       pro: "✓",          enterprise: "✓" },
  { feature: "API REST",         free: "Limitée", pro: "Complète",   enterprise: "Complète" },
  { feature: "Webhooks",         free: "—",       pro: "✓",          enterprise: "✓" },
  { feature: "Rapport PDF",      free: "—",       pro: "✓",          enterprise: "✓" },
  { feature: "SLA",              free: "—",       pro: "99.9%",      enterprise: "99.99%" },
  { feature: "Support",         free: "Communauté", pro: "Prioritaire", enterprise: "Dédié 24/7" },
  { feature: "On-premise",       free: "—",       pro: "—",          enterprise: "✓" },
];

const FAQS = [
  {
    q: "Comment fonctionne le plan Free ?",
    a: "Le plan Free offre 5 scans par mois avec les fonctionnalités de base. Pas de carte bancaire requise.",
  },
  {
    q: "Puis-je passer à Pro à tout moment ?",
    a: "Oui, la migration est instantanée. Vos données et scans existants sont conservés.",
  },
  {
    q: "L'API est-elle disponible en Free ?",
    a: "Une version limitée de l'API est disponible en Free (5 req/jour). Le plan Pro lève toutes les limites.",
  },
  {
    q: "Comment fonctionne Enterprise ?",
    a: "Enterprise inclut un déploiement on-premise, un SLA 99.99%, et un ingénieur dédié. Contactez-nous pour un devis.",
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
            { name: "Free",       price: "0€",       badge: null,        cta: "Démarrer", href: "/beta",    featured: false },
            { name: "Pro",        price: "49€/mois",  badge: "Populaire", cta: "Essayer",  href: "/beta",    featured: true  },
            { name: "Enterprise", price: "Sur devis", badge: null,        cta: "Contact",  href: "/contact", featured: false },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`p-10 flex flex-col gap-6 ${plan.featured ? "bg-[var(--bg-card)]" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">{plan.name}</p>
                  <p className="text-3xl font-black font-mono">{plan.price}</p>
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
