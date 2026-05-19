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
        background: "var(--bjhunt-bg)",
        borderTop: "1px solid var(--bjhunt-border)",
      }}
    >
      <motion.div
        className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-6 px-6 md:px-8"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      >
        <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
          {t("eyebrow")}
        </p>

        <h2
          className="m-0"
          style={{
            fontFamily: "var(--bjhunt-font-display)",
            fontSize: "clamp(32px, 4.5vw, 52px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            color: "var(--bjhunt-text)",
          }}
        >
          {t("title")}{" "}
          <span style={{ color: "var(--bjhunt-brand)" }}>{t("titleHighlight")}</span>
        </h2>

        <p className="text-[16px] font-sans font-normal leading-[1.6] text-bjhunt-text-secondary max-w-[520px] m-0">
          {t("description")}
        </p>

        <Link
          href="/beta"
          className="mt-2 inline-flex h-11 items-center gap-2 rounded-md px-5 text-[13px] font-medium transition-all duration-200"
          style={{
            background: "var(--bjhunt-brand)",
            color: "var(--bjhunt-text-inverted)",
          }}
        >
          {t("cta")} →
        </Link>

        <p className="text-[12px] font-mono font-medium uppercase tracking-[0.12em] text-bjhunt-text-muted m-0">
          {t("note")}
        </p>
      </motion.div>
    </section>
  );
}
