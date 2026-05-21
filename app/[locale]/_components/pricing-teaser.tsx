"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function PricingTeaser() {
  const t = useTranslations("pricing");

  return (
    <section className="py-16 md:py-24" style={{
      background: "var(--bjhunt-bg)",
      borderTop: "1px solid var(--bjhunt-border)",
    }}>
      <div className="mx-auto w-full max-w-[760px] px-6 md:px-8 lg:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="flex flex-col items-center gap-5"
        >
          <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
            [ {t("heroEyebrow")} ]
          </p>

          <h2 className="text-[clamp(28px,3.5vw,42px)] font-display font-normal leading-[1.05] tracking-[-0.025em] text-bjhunt-text m-0">
            {t("heroTitle")}{" "}
            <span className="text-bjhunt-brand">{t("heroHighlight")}</span>
          </h2>

          <p className="text-[14px] font-sans font-normal leading-[1.6] text-bjhunt-text-secondary max-w-[520px] m-0">
            {t("heroDescription")}
          </p>

          <Link
            href="/pricing"
            className="inline-flex h-10 items-center gap-2 rounded-md border px-5 text-[13px] font-medium transition-all duration-200"
            style={{
              color: "var(--bjhunt-text)",
              borderColor: "var(--bjhunt-border)",
              background: "transparent",
            }}
          >
            View pricing →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
