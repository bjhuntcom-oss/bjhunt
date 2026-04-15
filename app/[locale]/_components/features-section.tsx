// app/[locale]/_components/features-section.tsx
"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { FeatureCard } from "@/components/ui/feature-card";
import { NetworkTopologySVG } from "@/components/animations/network-topology";
import { CVEHeatmapSVG } from "@/components/animations/cve-heatmap";
import { IsometricServerSVG } from "@/components/animations/isometric-server";
import { SectionLabel } from "@/components/ui/section-label";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export function FeaturesSection() {
  const t = useTranslations("features");

  return (
    <section className="py-24 px-8 md:px-12">
      <motion.div
        className="mb-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        <SectionLabel>Fonctionnalités</SectionLabel>
        <h2 className="text-4xl md:text-5xl font-black mt-4 tracking-[-0.03em]">
          {t("title")}
        </h2>
        <p className="text-[var(--text-muted)] text-sm mt-3 max-w-lg">
          {t("subtitle")}
        </p>
      </motion.div>

      <motion.div
        className="grid md:grid-cols-3 gap-px bg-[var(--border)]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        <motion.div variants={fadeUp}>
          <FeatureCard
            tag="Détection"
            title={t("scan_title")}
            description={t("scan_desc")}
            illustration={<NetworkTopologySVG className="w-full h-48" />}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <FeatureCard
            tag="CVE"
            title={t("cve_title")}
            description={t("cve_desc")}
            illustration={<CVEHeatmapSVG className="w-full h-48" />}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <FeatureCard
            tag="Infrastructure"
            title={t("infra_title")}
            description={t("infra_desc")}
            illustration={
              <div className="w-full h-48 flex items-center justify-center">
                <IsometricServerSVG className="w-32 h-32" />
              </div>
            }
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
