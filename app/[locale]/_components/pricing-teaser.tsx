"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { StatusDot } from "@/components/ui/status-dot";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const PLAN_KEYS = ["free", "pro", "enterprise"] as const;
const PLAN_HREFS: Record<string, "/beta" | "/contact"> = {
  free: "/beta",
  pro: "/beta",
  enterprise: "/contact",
};

export function PricingTeaser() {
  const t = useTranslations("pricing");

  return (
    <section className="py-16 md:py-24" style={{ background: "var(--bjhunt-bg)" }}>
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
        <motion.div
          className="grid grid-cols-1 gap-px md:grid-cols-3"
          style={{ background: "var(--bjhunt-border)" }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {PLAN_KEYS.map((key, i) => {
            const featured = key === "pro";
            const badge = featured ? t(`${key}.badge`) : null;
            return (
              <motion.article
                key={key}
                variants={fadeUp}
                className="relative flex flex-col gap-5 p-6 md:p-8"
                style={{ background: "var(--bjhunt-bg-surface)" }}
              >
                {badge && (
                  <span className="absolute right-5 top-5">
                    <StatusDot state="success" label={badge} />
                  </span>
                )}

                <header className="flex flex-col gap-2">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted">
                    P{i} · {t(`${key}.name`)}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[34px] font-mono font-medium leading-none tracking-[-0.02em] text-bjhunt-text">
                      {t(`${key}.price`)}
                    </span>
                    <span className="text-[12px] font-mono text-bjhunt-text-muted">
                      {t(`${key}.period`)}
                    </span>
                  </div>
                  <p className="text-[13px] font-sans text-bjhunt-text-muted m-0">
                    {t(`${key}.description`)}
                  </p>
                </header>

                <ul className="flex flex-col gap-2 list-none p-0 m-0">
                  {(t.raw(`${key}.features`) as string[]).map((f: string) => (
                    <li key={f} className="flex items-start gap-3 text-[13px] font-sans text-bjhunt-text-secondary leading-[1.5]">
                      <span aria-hidden className="font-mono text-bjhunt-text-muted">─</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={PLAN_HREFS[key]}
                  className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-[13px] font-medium transition-all duration-200"
                  style={{
                    color: featured ? "var(--bjhunt-brand)" : "var(--bjhunt-text)",
                    borderColor: featured ? "var(--bjhunt-brand)" : "var(--bjhunt-border)",
                    background: "transparent",
                  }}
                >
                  {t(`${key}.cta`)} →
                </Link>
              </motion.article>
            );
          })}
        </motion.div>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="text-[12px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted transition-colors hover:text-bjhunt-brand"
          >
            View all details →
          </Link>
        </div>
      </div>
    </section>
  );
}
