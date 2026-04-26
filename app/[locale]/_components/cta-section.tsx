// app/[locale]/_components/cta-section.tsx
//
// BJHUNT 2026 refonte — flat canvas, hero-style 2-line H1 60px system-ui,
// single ghost button. NO ambient gradient.

"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function CTASection() {
  const t = useTranslations("cta");

  return (
    <section
      className="py-20 text-center sm:py-24 md:py-28"
      style={{
        background: "var(--bjhunt-2026-bg)",
        borderTop: "1px solid var(--bjhunt-2026-border)",
      }}
    >
      <motion.div
        className="mx-auto flex w-full max-w-[860px] flex-col items-center gap-8 px-6 md:px-8"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p
          className="m-0 font-mono uppercase"
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: "var(--bjhunt-2026-text-muted)",
          }}
        >
          05 / Get started
        </p>

        <h2
          className="m-0"
          style={{
            fontFamily: "var(--bjhunt-2026-font-display)",
            fontSize: "clamp(40px, 5vw, 60px)",
            fontWeight: 400,
            lineHeight: 1.0,
            letterSpacing: "-0.025em",
            color: "var(--bjhunt-2026-text)",
          }}
        >
          {t("title")}
          <br />
          <em
            className="not-italic"
            style={{ color: "var(--bjhunt-2026-text-secondary)" }}
          >
            {t("subtitle")}
          </em>
        </h2>

        <Link
          href="/beta"
          className="inline-flex h-11 items-center gap-3 rounded-md border px-5 transition-colors"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--bjhunt-2026-text)",
            borderColor: "var(--bjhunt-2026-border)",
            background: "transparent",
          }}
        >
          {t("cta")}
          <span aria-hidden>→</span>
        </Link>

        <p
          className="m-0 font-mono uppercase"
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.18em",
            color: "var(--bjhunt-2026-text-muted)",
          }}
        >
          {t("note")}
        </p>
      </motion.div>
    </section>
  );
}
