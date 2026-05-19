"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { ArrowRight, Play } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

interface KpiProps {
  value: string;
  label: string;
}

function KpiCell({ value, label }: KpiProps) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-4"
      style={{ background: "var(--bjhunt-bg)" }}
    >
      <span
        className="tabular-nums"
        style={{
          fontFamily: "var(--bjhunt-font-mono)",
          fontSize: 22,
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: "var(--bjhunt-brand)",
        }}
      >
        {value}
      </span>
      <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted">
        {label}
      </span>
    </div>
  );
}

export function HomeHero() {
  const t = useTranslations("hero");

  const kpis = [
    { value: "15+", label: t("stats.toolsIntegrated") },
    { value: "<5%", label: t("stats.falsePositiveRate") },
    { value: "27B", label: t("stats.modelSize") },
  ];

  return (
    <section className="relative overflow-hidden" style={{ background: "var(--bjhunt-bg)" }}>
      {/* Subtle gradient accent top-right */}
      <div
        className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.07]"
        style={{
          background: "radial-gradient(circle at 80% 20%, var(--bjhunt-brand), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.05]"
        style={{
          background: "radial-gradient(circle at 20% 80%, var(--bjhunt-accent), transparent 70%)",
        }}
      />

      <div className="mx-auto w-full max-w-[1280px] px-6 pt-20 pb-16 sm:pt-28 sm:pb-20 md:px-8 md:pt-32 md:pb-24 lg:px-12">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            <motion.p variants={fadeUp} className="mb-5">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-[0.15em]"
                style={{ borderColor: "var(--bjhunt-brand-soft)", color: "var(--bjhunt-brand)" }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="bjhunt-pulse-live absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "var(--bjhunt-brand)" }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "var(--bjhunt-brand)" }} />
                </span>
                {t("eyebrow")}
              </span>
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="m-0 mb-6"
              style={{
                fontFamily: "var(--bjhunt-font-display)",
                fontWeight: 400,
                fontSize: "clamp(36px, 5.5vw, 64px)",
                lineHeight: 1.04,
                letterSpacing: "-0.025em",
                color: "var(--bjhunt-text)",
              }}
            >
              {t("title")}{" "}
              <span style={{ color: "var(--bjhunt-brand)" }}>{t("titleHighlight")}</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="m-0 mb-8 max-w-[540px] text-[16px] leading-[1.6] font-normal"
              style={{ color: "var(--bjhunt-text-secondary)" }}
            >
              {t("description")}
            </motion.p>

            <motion.div variants={fadeUp} className="mb-10 flex flex-wrap items-center gap-3">
              <Link
                href="/beta"
                className="inline-flex h-11 items-center gap-2 rounded-md px-5 text-[13px] font-medium transition-all duration-200"
                style={{
                  background: "var(--bjhunt-brand)",
                  color: "var(--bjhunt-text-inverted)",
                }}
              >
                {t("ctaPrimary")} <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#"
                className="inline-flex h-11 items-center gap-2 rounded-md border px-5 text-[13px] font-medium transition-all duration-200"
                style={{
                  borderColor: "var(--bjhunt-border)",
                  color: "var(--bjhunt-text)",
                  background: "transparent",
                }}
              >
                <Play className="h-4 w-4" /> {t("ctaSecondary")}
              </a>
            </motion.div>

            <motion.dl
              variants={fadeUp}
              className="m-0 grid max-w-[480px] grid-cols-3 gap-px"
              style={{ background: "var(--bjhunt-border)" }}
            >
              {kpis.map((kpi) => (
                <KpiCell key={kpi.label} {...kpi} />
              ))}
            </motion.dl>
          </motion.div>

          {/* Terminal preview card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="hidden lg:block"
          >
            <div
              className="overflow-hidden rounded-lg border"
              style={{
                background: "var(--bjhunt-terminal-bg)",
                borderColor: "var(--bjhunt-border)",
              }}
            >
              <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--bjhunt-border)" }}>
                <div className="h-3 w-3 rounded-full" style={{ background: "var(--bjhunt-critical)" }} />
                <div className="h-3 w-3 rounded-full" style={{ background: "var(--bjhunt-warning)" }} />
                <div className="h-3 w-3 rounded-full" style={{ background: "var(--bjhunt-success)" }} />
                <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.15em] text-bjhunt-text-muted">bjhunt terminal</span>
              </div>
              <div className="p-5">
                <div className="font-mono text-[12px] leading-[1.8]">
                  <div style={{ color: "var(--bjhunt-brand)" }}>{t("terminalLine1")}</div>
                  <div style={{ color: "var(--bjhunt-success)" }}>{t("terminalLine2")}</div>
                  <div style={{ color: "var(--bjhunt-text-muted)" }}>{t("terminalLine3")}</div>
                  <div style={{ color: "var(--bjhunt-text)" }}>{t("terminalLine4")}</div>
                  <div className="mt-3 flex gap-2 items-center" style={{ color: "var(--bjhunt-brand)" }}>
                    <span>$</span>
                    <span
                      className="inline-block h-[14px] w-[7px] align-text-bottom animate-pulse"
                      style={{ background: "var(--bjhunt-text)" }}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
