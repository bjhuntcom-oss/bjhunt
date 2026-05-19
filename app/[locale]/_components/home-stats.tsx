"use client";

import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/marketing/section-header";
import { StatsSection } from "@/components/marketing/stats-section";

export function HomeStats() {
  const t = useTranslations("stats");

  const stats = [
    { value: t("stat1.value"), label: t("stat1.label") },
    { value: t("stat2.value"), label: t("stat2.label") },
    { value: t("stat3.value"), label: t("stat3.label") },
    { value: t("stat4.value"), label: t("stat4.label") },
  ];

  return (
    <section
      className="py-16 md:py-24"
      style={{
        background: "var(--bjhunt-bg)",
        borderBottom: "1px solid var(--bjhunt-border)",
      }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          highlight={t("titleHighlight")}
        />
        <StatsSection stats={stats} />
      </div>
    </section>
  );
}
