"use client";

import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/marketing/section-header";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import {
  Cpu,
  Puzzle,
  FileText,
  Shield,
  Cloud,
  CheckCircle,
} from "lucide-react";

export function FeaturesSection() {
  const t = useTranslations("features");
  const fc = useTranslations("features.cards");

  const cards = [
    { icon: Cpu, title: fc("orchestration.title"), description: fc("orchestration.description") },
    { icon: Puzzle, title: fc("toolchain.title"), description: fc("toolchain.description") },
    { icon: FileText, title: fc("reporting.title"), description: fc("reporting.description") },
    { icon: Shield, title: fc("security.title"), description: fc("security.description") },
    { icon: Cloud, title: fc("infrastructure.title"), description: fc("infrastructure.description") },
    { icon: CheckCircle, title: fc("compliance.title"), description: fc("compliance.description") },
  ];

  return (
    <section className="py-16 md:py-24" style={{ background: "var(--bjhunt-bg)" }}>
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          highlight={t("titleHighlight")}
          description={t("description")}
        />
        <FeatureGrid cards={cards} />
      </div>
    </section>
  );
}
