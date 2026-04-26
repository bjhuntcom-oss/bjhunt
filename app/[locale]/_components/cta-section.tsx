// app/[locale]/_components/cta-section.tsx
"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function CTASection() {
  const t = useTranslations("cta");

  return (
    <section
      className="relative overflow-hidden px-8 py-40 text-center"
      style={{ borderTop: "1px solid var(--bjhunt-border)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(99,102,241,0.08), transparent 60%),"
            + "radial-gradient(ellipse 30% 20% at 50% 100%, rgba(100,210,255,0.04), transparent 60%)",
        }}
      />
      <motion.div
        className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-10"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p
          className="m-0 font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--bjhunt-text-subtle)" }}
        >
          05 / Get started
        </p>
        <h2
          className="m-0"
          style={{
            fontSize: "clamp(44px, 7vw, 80px)",
            fontWeight: 200,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
          }}
        >
          {t("title")}
          <br />
          <em className="not-italic" style={{ color: "var(--bjhunt-text-muted)", fontWeight: 200 }}>
            {t("subtitle")}
          </em>
        </h2>
        <Link
          href="/beta"
          className="inline-flex items-center gap-3 px-7 py-4 font-mono uppercase transition-colors duration-200"
          style={{
            fontSize: 11,
            letterSpacing: "0.22em",
            color: "var(--bjhunt-text)",
            border: "1px solid var(--bjhunt-border-strong)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          {t("cta")}
          <span aria-hidden>→</span>
        </Link>
        <p
          className="m-0 font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: "0.22em", color: "var(--bjhunt-text-disabled)" }}
        >
          {t("note")}
        </p>
      </motion.div>
    </section>
  );
}
