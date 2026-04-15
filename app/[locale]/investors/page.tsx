"use client";

import { useTranslations, useLocale } from "next-intl";
import { GrowthLineSVG } from "@/components/animations/growth-line";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

export default function InvestorsPage() {
  const t = useTranslations("investors");
  const locale = useLocale();

  return (
    <div className="pt-14">
      <section className="border-b border-[var(--border)] py-20 px-8 md:px-12">
        <SectionLabel>Investisseurs</SectionLabel>
        <h1 className="text-5xl md:text-6xl font-black mt-4 tracking-[-0.03em]">
          Investir dans la<br />
          <span className="text-[var(--text-muted)]">cybersécurité AI-First.</span>
        </h1>
      </section>

      <section className="border-b border-[var(--border)] grid grid-cols-2 md:grid-cols-4 divide-x divide-[var(--border)]">
        {[
          { value: "2026", label: "Lancement" },
          { value: "Beta", label: "Phase actuelle" },
          { value: "10B€", label: "Marché adressable" },
          { value: "0", label: "Faux positifs" },
        ].map(({ value, label }) => (
          <div key={label} className="p-8 flex flex-col gap-1">
            <div className="text-4xl font-black font-mono">{value}</div>
            <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.15em]">{label}</div>
          </div>
        ))}
      </section>

      <section className="border-b border-[var(--border)] grid lg:grid-cols-2">
        <div className="p-10 flex flex-col gap-6">
          <SectionLabel>Pourquoi BJHUNT</SectionLabel>
          <h2 className="text-3xl font-black tracking-tight">
            Le marché de la sécurité AI évolue. Nous sommes en avance.
          </h2>
          {[
            "Détection CVE en temps réel sans agent",
            "API-first, intégration CI/CD native",
            "Zero false-positive grâce au modèle AI propriétaire",
          ].map((point) => (
            <div key={point} className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
              <span className="text-[var(--success)] mt-0.5">→</span>
              {point}
            </div>
          ))}
        </div>
        <div className="border-l border-[var(--border)] flex items-center justify-center p-12" style={{ minHeight: 300 }}>
          <GrowthLineSVG className="w-full max-w-xs opacity-80" />
        </div>
      </section>

      <section className="py-20 px-8 flex flex-col gap-4 items-start">
        <SectionLabel>Contact investisseurs</SectionLabel>
        <h2 className="text-3xl font-black tracking-tight">Intéressé par BJHUNT ?</h2>
        <div className="flex gap-3">
          <Button asChild>
            <a href="mailto:partner@bjhunt.com">Contacter l'équipe →</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
