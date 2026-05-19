"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MonoDiagram } from "@/components/ui/mono-diagram";
import { StatusDot } from "@/components/ui/status-dot";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

function Section({
  children,
  last,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section
      className="py-16 md:py-24"
      style={{
        background: "var(--bjhunt-bg)",
        borderBottom: last ? undefined : "1px solid var(--bjhunt-border)",
      }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
        {children}
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  highlight,
  description,
}: {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
}) {
  return (
    <motion.header className="max-w-2xl" variants={fadeUp}>
      <p className="mb-4 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
        {eyebrow}
      </p>
      <h2
        className="m-0"
        style={{
          fontFamily: "var(--bjhunt-font-display)",
          fontSize: "clamp(28px, 3vw, 36px)",
          fontWeight: 400,
          lineHeight: 1.11,
          letterSpacing: "-0.025em",
          color: "var(--bjhunt-text)",
        }}
      >
        {title}{" "}
        <span style={{ color: "var(--bjhunt-brand)" }}>{highlight}</span>
      </h2>
      <p className="mt-4 text-[16px] font-sans font-normal leading-[1.6] text-bjhunt-text-secondary m-0">
        {description}
      </p>
    </motion.header>
  );
}

export default function TechnologyPage() {
  const t = useTranslations("technology");

  const orchestrationAscii = `
                    ┌──────────────────┐
                    │   BJHUNT  CORE   │
                    │   ORCHESTRATOR   │
                    └────────┬─────────┘
                             │
       ┌─────────┬───────────┼───────────┬─────────┐
       │         │           │           │         │
  ┌────┴────┐ ┌──┴───┐  ┌────┴────┐ ┌────┴────┐ ┌──┴────┐
  │ RECON   │ │EXPLOIT│ │ ANALYST │ │ CLOUD   │ │ DEFENSE│
  └─────────┘ └──────┘  └─────────┘ └─────────┘ └────────┘
`;

  const sandboxAscii = `
                ┌──────────────────────────────────┐
                │       ISOLATED SANDBOX           │
   TEST  ────►  │  ┌────────────────────────────┐  │  ────►  RESULTS
                │  │        [SHIELD]            │  │
                │  │   EPHEMERAL · NET-ISOLATED │  │
                │  └────────────────────────────┘  │
                └──────────────────────────────────┘
`;

  return (
    <div style={{ background: "var(--bjhunt-bg)" }}>
      {/* Hero */}
      <section
        className="py-16 md:py-24"
        style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
      >
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="grid grid-cols-1 items-end gap-10 lg:grid-cols-[1fr_360px] lg:gap-16"
          >
            <div>
              <motion.p
                variants={fadeUp}
                className="mb-4 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0"
              >
                {t("heroEyebrow")}
              </motion.p>
              <motion.h1
                variants={fadeUp}
                className="m-0 mb-5"
                style={{
                  fontFamily: "var(--bjhunt-font-display)",
                  fontSize: "clamp(40px, 5vw, 60px)",
                  fontWeight: 400,
                  lineHeight: 1.0,
                  letterSpacing: "-0.025em",
                  color: "var(--bjhunt-text)",
                }}
              >
                {t("heroTitle")}{" "}
                <span style={{ color: "var(--bjhunt-brand)" }}>{t("heroHighlight")}</span>
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mb-8 max-w-[560px] text-[16px] font-sans font-normal leading-[1.6] text-bjhunt-text-secondary m-0"
              >
                {t("heroDescription")}
              </motion.p>
              <motion.div variants={fadeUp}>
                <Button asChild variant="ghost" size="md">
                  <Link href="/beta">Request Access →</Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* BJHUNT 27B Model */}
      <Section>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
          <SectionHeader
            eyebrow={t("model.eyebrow")}
            title={t("model.title")}
            highlight={t("model.titleHighlight")}
            description={t("model.description")}
          />
        </motion.div>
      </Section>

      {/* Orchestration */}
      <Section>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
          <SectionHeader
            eyebrow={t("orchestration.eyebrow")}
            title={t("orchestration.title")}
            highlight={t("orchestration.titleHighlight")}
            description={t("orchestration.description")}
          />
          <motion.div variants={fadeUp} className="mt-10 md:mt-12">
            <MonoDiagram
              ascii={orchestrationAscii}
              highlight={/BJ HUNT  CORE/g}
              caption="HUB & SPOKE — 1 ORCHESTRATOR · 5 SPECIALISTS"
            />
          </motion.div>
          <motion.div
            variants={fadeUp}
            className="mt-10 grid max-w-2xl grid-cols-3 gap-px"
            style={{ background: "var(--bjhunt-border)" }}
          >
            {[
              { value: "17", label: t("orchestration.stats.agents") },
              { value: "100+", label: t("orchestration.stats.tools") },
              { value: "24/7", label: t("orchestration.stats.uptime") },
            ].map(({ value, label }) => (
              <div key={label} className="px-4 py-5 text-center sm:px-6" style={{ background: "var(--bjhunt-bg-surface)" }}>
                <span
                  style={{
                    fontFamily: "var(--bjhunt-font-mono)",
                    fontSize: 24,
                    fontWeight: 500,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                    color: "var(--bjhunt-brand)",
                  }}
                >
                  {value}
                </span>
                <p className="mt-2 text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
                  {label}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </Section>

      {/* Sandbox */}
      <Section>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
          <SectionHeader
            eyebrow={t("sandbox.eyebrow")}
            title={t("sandbox.title")}
            highlight={t("sandbox.titleHighlight")}
            description={t("sandbox.description")}
          />
          <motion.div variants={fadeUp} className="mt-10 md:mt-12">
            <MonoDiagram
              ascii={sandboxAscii}
              highlight={/ISOLATED SANDBOX|TEST|RESULTS/g}
              caption={t("sandbox.diagramCaption")}
            />
          </motion.div>
        </motion.div>
      </Section>

      {/* Reporting */}
      <Section last>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
          <SectionHeader
            eyebrow={t("reporting.eyebrow")}
            title={t("reporting.title")}
            highlight={t("reporting.titleHighlight")}
            description={t("reporting.description")}
          />
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="ghost" size="md">
              <Link href="/beta">{t("ctaPrimary")}</Link>
            </Button>
          </motion.div>
        </motion.div>
      </Section>
    </div>
  );
}
