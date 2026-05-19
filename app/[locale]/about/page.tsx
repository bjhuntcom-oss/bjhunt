"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/marketing/section-header";
import { Shield, Zap, Users, Target } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export default function AboutPage() {
  const t = useTranslations("about");

  return (
    <div className="pt-14" style={{ background: "var(--bjhunt-bg)", minHeight: "100vh" }}>
      {/* Hero */}
      <section className="py-16 md:py-24" style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            <motion.p variants={fadeUp} className="mb-4 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
              {t("heroEyebrow")}
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="m-0 mb-6 max-w-3xl"
              style={{
                fontFamily: "var(--bjhunt-font-display)",
                fontSize: "clamp(36px, 5vw, 60px)",
                fontWeight: 400,
                lineHeight: 1.04,
                letterSpacing: "-0.025em",
                color: "var(--bjhunt-text)",
              }}
            >
              {t("heroTitle")}{" "}
              <span style={{ color: "var(--bjhunt-brand)" }}>{t("heroHighlight")}</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="max-w-[600px] text-[16px] font-sans font-normal leading-[1.6] text-bjhunt-text-secondary m-0"
            >
              {t("heroDescription")}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-24" style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            <div className="flex flex-col justify-center">
              <SectionHeader
                eyebrow={t("mission.eyebrow")}
                title={t("mission.title")}
                highlight={t("mission.titleHighlight")}
                description={t("mission.description")}
              />
            </div>
            <div className="grid grid-cols-2 gap-px" style={{ background: "var(--bjhunt-border)" }}>
              {[
                { icon: Target, value: "2023", label: "Founded" },
                { icon: Zap, value: "Beta", label: "Current Phase" },
                { icon: Shield, value: "27B", label: "Model Parameters" },
                { icon: Users, value: "Security", label: "By Engineers" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 p-6" style={{ background: "var(--bjhunt-bg-surface)" }}>
                  <Icon className="h-5 w-5 text-bjhunt-brand mb-1" />
                  <span className="text-[24px] font-mono font-semibold leading-none tracking-[-0.02em] text-bjhunt-text">
                    {value}
                  </span>
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
          <SectionHeader
            eyebrow={t("team.eyebrow")}
            title={t("team.title")}
            highlight={t("team.titleHighlight")}
            description={t("team.description")}
          />
        </div>
      </section>
    </div>
  );
}
