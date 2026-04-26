// app/[locale]/_components/hero.tsx
"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

/**
 * W8 hero — Inter 200 ultralight 96px display, JetBrains Mono eyebrow,
 * glass meta panel on the right column with hairline-separated rows.
 * Ambient indigo radial bleeds from the top-left corner.
 */
export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="relative overflow-hidden">
      {/* ambient W8 radial gradients — non-blocking, behind content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 8% 0%, rgba(99,102,241,0.10), transparent 55%),"
            + "radial-gradient(ellipse 50% 40% at 92% 18%, rgba(255,69,58,0.04), transparent 50%),"
            + "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(100,210,255,0.03), transparent 55%)",
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[1680px] grid-cols-1 items-end gap-16 px-8 pt-24 pb-32 md:px-12 lg:grid-cols-[1fr_400px] lg:gap-24 lg:px-16 lg:pt-32 lg:pb-40">
        {/* Left — display copy */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.p
            variants={fadeUp}
            className="m-0 mb-8 font-mono text-[10px] uppercase tracking-[0.32em]"
            style={{ color: "var(--bjhunt-text-subtle)" }}
          >
            <span style={{ color: "var(--bjhunt-text-muted)", fontWeight: 400 }}>BJHUNT</span>
            {" / "}
            <span>Cybersecurity AI · Closed Beta · v1.0</span>
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="m-0 mb-8 text-white"
            style={{
              fontWeight: 200,
              fontSize: "clamp(48px, 9vw, 96px)",
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
            }}
          >
            {t("line1")}
            <em className="not-italic" style={{ color: "var(--bjhunt-text-muted)", fontWeight: 200 }}>.</em>
            <br />
            {t("line2")}
            <em className="not-italic" style={{ color: "var(--bjhunt-text-muted)", fontWeight: 200 }}>.</em>
            <br />
            <em className="not-italic" style={{ color: "var(--bjhunt-text-muted)", fontWeight: 200 }}>{t("line3")}.</em>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="m-0 mb-12 max-w-[640px]"
            style={{
              color: "var(--bjhunt-text-muted)",
              fontSize: 17,
              lineHeight: 1.6,
              fontWeight: 300,
            }}
          >
            {t("subtitle")}
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
            <Link
              href="/beta"
              className="inline-flex items-center gap-2 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors duration-200"
              style={{
                color: "var(--bjhunt-text)",
                border: "1px solid var(--bjhunt-border-strong)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              {t("cta_primary")}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/api-docs"
              className="inline-flex items-center gap-2 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors duration-200"
              style={{
                color: "var(--bjhunt-text-muted)",
                border: "1px solid var(--bjhunt-border)",
              }}
            >
              {t("cta_secondary")}
            </Link>
          </motion.div>
        </motion.div>

        {/* Right — glass meta card */}
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="hidden flex-col gap-4 p-7 lg:flex"
          style={{
            border: "1px solid var(--bjhunt-border)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.003))",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {[
            { lbl: "AGENTS", val: "17 / IA" },
            { lbl: "UPTIME", val: "99.97%" },
            { lbl: "SCAN P95", val: "< 2.0 s" },
            { lbl: "FALSE POS.", val: "0.0%" },
            { lbl: "BUILD", val: "v1.0.0-rc" },
          ].map((row, i, arr) => (
            <div
              key={row.lbl}
              className="flex items-baseline justify-between pb-3.5"
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 10,
                letterSpacing: "0.15em",
                borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--bjhunt-border)",
                paddingBottom: i === arr.length - 1 ? 0 : 14,
              }}
            >
              <span
                className="uppercase"
                style={{ color: "var(--bjhunt-text-subtle)", fontSize: 9, letterSpacing: "0.24em" }}
              >
                {row.lbl}
              </span>
              <span style={{ color: "var(--bjhunt-text)", fontVariantNumeric: "tabular-nums" }}>{row.val}</span>
            </div>
          ))}
        </motion.aside>
      </div>
    </section>
  );
}
