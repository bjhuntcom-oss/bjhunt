// app/[locale]/_components/cta-section.tsx
"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function CTASection() {
  const t = useTranslations("cta");

  return (
    <section className="relative border-t border-[var(--border)] py-32 px-8 text-center overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: 600,
          height: 600,
          background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
        }}
      />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      >
        <h2 className="text-5xl md:text-6xl font-black tracking-[-0.03em] max-w-2xl">
          {t("title")}<br />
          <span className="text-[var(--text-muted)]">{t("subtitle")}</span>
        </h2>
        <Button asChild size="lg">
          <Link href="/beta">{t("cta")}</Link>
        </Button>
        <p className="text-[10px] text-[var(--text-muted)]">{t("note")}</p>
      </motion.div>
    </section>
  );
}
