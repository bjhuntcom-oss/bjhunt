// app/[locale]/_components/hero.tsx
"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { HeroTerminal } from "@/components/ui/hero-terminal";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="relative flex items-center overflow-hidden">
      <div className="bg-grid absolute inset-0 pointer-events-none" />
      <div className="scan-line" />

      <div className="relative z-10 w-full grid lg:grid-cols-2 gap-0">
        {/* Left — copy */}
        <div className="flex flex-col justify-center px-8 md:px-12 lg:px-16 py-16 border-r border-[var(--border)]">
          <motion.div
            className="flex flex-col gap-6"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.div variants={fadeUp}>
              <SectionLabel>Cybersécurité AI-First · Beta</SectionLabel>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-[-0.03em] text-white"
            >
              {t("line1")}<span className="text-[var(--text-muted)]">.</span><br />
              {t("line2")}<span className="text-[var(--text-muted)]">.</span><br />
              {t("line3")}<span className="text-[var(--text-muted)]">.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-sm text-[var(--text-muted)] leading-relaxed max-w-sm"
            >
              {t("subtitle")}
            </motion.p>

            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <Button asChild size="lg">
                <Link href="/beta">{t("cta_primary")}</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/api-docs">{t("cta_secondary")} →</Link>
              </Button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="flex items-center gap-6 pt-4 border-t border-[var(--border)]"
            >
              {[
                { value: "99.9%", label: "Uptime" },
                { value: "<2s",   label: "Scan" },
                { value: "0",     label: "False positives" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-lg font-black font-mono text-white">{value}</div>
                  <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest">{label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Right — cycling AI conversation terminal */}
        <div className="hidden lg:flex flex-col justify-center px-12 py-16 relative">
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          >
            <HeroTerminal className="w-full" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
