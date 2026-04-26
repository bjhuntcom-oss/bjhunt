// app/[locale]/_components/hero.tsx
//
// BJHUNT 2026 refonte — editorial display 60px clamp, hairline metadata
// grid (no glass), KPI strip, no ambient gradient. Per
// docs/refonte-2026/DESIGN-SYSTEM-2026.md §1, §2, §6 (responsive).

"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const META_ROWS: Array<{ lbl: string; val: string }> = [
  { lbl: "AGENTS",     val: "17 / IA" },
  { lbl: "UPTIME",     val: "99.97%" },
  { lbl: "SCAN P95",   val: "< 2.0s" },
  { lbl: "FALSE POS.", val: "0.0%" },
];

const KPI_STRIP: Array<{ value: string; label: string }> = [
  { value: "317+", label: "TOOLS" },
  { value: "17",   label: "AGENTS" },
  { value: "0",    label: "FALSE POS." },
];

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section
      className="relative"
      style={{ background: "var(--bjhunt-2026-bg)" }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 py-16 sm:py-20 md:px-8 md:py-24 lg:px-12">
        <div className="grid grid-cols-1 items-end gap-10 sm:gap-12 md:gap-16 lg:grid-cols-[1fr_320px]">
          {/* Left — copy column */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {/* Eyebrow — mono 12 UPPERCASE +0.18em */}
            <motion.p variants={fadeUp} className="m-0 mb-6">
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  color: "var(--bjhunt-2026-text-muted)",
                }}
              >
                BJHUNT / Cybersecurity AI · Closed Beta · v1.0
              </span>
            </motion.p>

            {/* H1 — system-ui weight 400, clamp(28-48), -0.025em */}
            <motion.h1
              variants={fadeUp}
              className="m-0 mb-6"
              style={{
                fontFamily: "var(--bjhunt-2026-font-display)",
                fontWeight: 400,
                fontSize: "clamp(28px, 4vw, 48px)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "var(--bjhunt-2026-text)",
              }}
            >
              {t("line1")}
              <em
                className="not-italic"
                style={{ color: "var(--bjhunt-2026-text-secondary)" }}
              >
                .
              </em>
              <br />
              {t("line2")}
              <em
                className="not-italic"
                style={{ color: "var(--bjhunt-2026-text-secondary)" }}
              >
                .
              </em>
              <br />
              <em
                className="not-italic"
                style={{ color: "var(--bjhunt-2026-text-secondary)" }}
              >
                {t("line3")}.
              </em>
            </motion.h1>

            {/* Lede — body L 16, weight 400 */}
            <motion.p
              variants={fadeUp}
              className="m-0 mb-8 max-w-[560px]"
              style={{
                fontSize: 16,
                fontWeight: 400,
                lineHeight: 1.6,
                color: "var(--bjhunt-2026-text-secondary)",
              }}
            >
              {t("subtitle")}
            </motion.p>

            {/* CTAs — ghost buttons per spec */}
            <motion.div variants={fadeUp} className="mb-10 flex flex-wrap items-center gap-3">
              <Link
                href="/beta"
                className="inline-flex h-11 items-center gap-2 rounded-md border px-4 transition-colors"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--bjhunt-2026-text)",
                  borderColor: "var(--bjhunt-2026-border)",
                  background: "transparent",
                }}
              >
                {t("cta_primary")}
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/api-docs"
                className="inline-flex h-11 items-center gap-2 rounded-md border px-4 transition-colors"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--bjhunt-2026-text-secondary)",
                  borderColor: "var(--bjhunt-2026-border)",
                  background: "transparent",
                }}
              >
                {t("cta_secondary")}
              </Link>
            </motion.div>

            {/* KPI strip — 3 numbers in mono 24, label mono 11 */}
            <motion.dl
              variants={fadeUp}
              className="m-0 grid max-w-[560px] grid-cols-3 gap-px"
              style={{ background: "var(--bjhunt-2026-border)" }}
            >
              {KPI_STRIP.map(({ value, label }) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 px-4 py-4"
                  style={{ background: "var(--bjhunt-2026-bg)" }}
                >
                  <dd
                    className="m-0"
                    style={{
                      fontFamily: "var(--bjhunt-2026-font-mono)",
                      fontSize: 24,
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: "var(--bjhunt-2026-text)",
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </dd>
                  <dt
                    className="font-mono uppercase"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.18em",
                      color: "var(--bjhunt-2026-text-muted)",
                    }}
                  >
                    {label}
                  </dt>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          {/* Right — hairline metadata grid (NOT glass panel) */}
          <motion.aside
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block"
            aria-label="Live platform metrics"
          >
            <div
              className="border"
              style={{
                borderColor: "var(--bjhunt-2026-border)",
                background: "var(--bjhunt-2026-bg-surface)",
                borderRadius: 8,
              }}
            >
              {META_ROWS.map((row, i) => (
                <div
                  key={row.lbl}
                  className="flex items-baseline justify-between px-5 py-4"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--bjhunt-2026-border)",
                  }}
                >
                  <span
                    className="font-mono uppercase"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.18em",
                      color: "var(--bjhunt-2026-text-muted)",
                    }}
                  >
                    {row.lbl}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontFamily: "var(--bjhunt-2026-font-mono)",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--bjhunt-2026-text)",
                    }}
                  >
                    {row.val}
                  </span>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
