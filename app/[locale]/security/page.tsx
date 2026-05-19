"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/marketing/section-header";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import {
  Shield,
  FileText,
  Key,
  Lock,
  Container,
  CheckCircle,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export default function SecurityPage() {
  const t = useTranslations("security");

  const cards = [
    { icon: Shield, title: t("isolation.title"), description: t("isolation.description") },
    { icon: FileText, title: t("auditTrails.title"), description: t("auditTrails.description") },
    { icon: Key, title: t("sso.title"), description: t("sso.description") },
    { icon: Lock, title: t("encryption.title"), description: t("encryption.description") },
    { icon: Container, title: t("sandboxSecurity.title"), description: t("sandboxSecurity.description") },
    { icon: CheckCircle, title: t("compliance.title"), description: t("compliance.description") },
  ];

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

      {/* Security features grid */}
      <section className="py-16 md:py-24">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
          <FeatureGrid cards={cards} />
        </div>
      </section>
    </div>
  );
}
