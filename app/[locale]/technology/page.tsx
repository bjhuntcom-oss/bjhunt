// app/[locale]/technology/page.tsx
//
// BJHUNT 2026 refonte — replaces 4 inline neural-net SVGs (~950 LOC)
// with monospaced ASCII rule-art via <MonoDiagram> + <NetworkTopologySVG>.
// Token-pinned colors, ghost buttons, no gradients/shadows. <500 LOC target.

"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { MonoDiagram } from "@/components/ui/mono-diagram";
import { NetworkTopologySVG } from "@/components/animations/network-topology";
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

/* Shared section wrapper — applies hairline divider, container, padding. */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="py-16 md:py-24"
      style={{
        background: "var(--bjhunt-2026-bg)",
        borderBottom: "1px solid var(--bjhunt-2026-border)",
      }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">{children}</div>
    </section>
  );
}

/* Reusable section header with eyebrow + h2 per spec. */
function SectionHeader({
  eyebrow,
  title,
  highlight,
  description,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description?: string;
}) {
  return (
    <motion.header className="max-w-2xl" variants={fadeUp}>
      <p
        className="m-0 mb-4 font-mono uppercase"
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.18em",
          color: "var(--bjhunt-2026-text-muted)",
        }}
      >
        {eyebrow}
      </p>
      <h2
        className="m-0"
        style={{
          fontFamily: "var(--bjhunt-2026-font-display)",
          fontSize: "clamp(28px, 3vw, 36px)",
          fontWeight: 400,
          lineHeight: 1.11,
          letterSpacing: "-0.025em",
          color: "var(--bjhunt-2026-text)",
        }}
      >
        {title}
        {highlight ? (
          <>
            <br />
            <em
              className="not-italic"
              style={{ color: "var(--bjhunt-2026-text-secondary)" }}
            >
              {highlight}
            </em>
          </>
        ) : null}
      </h2>
      {description ? (
        <p
          className="mt-4"
          style={{
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.6,
            color: "var(--bjhunt-2026-text-secondary)",
          }}
        >
          {description}
        </p>
      ) : null}
    </motion.header>
  );
}

/* HERO ───────────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section
      className="py-16 md:py-24"
      style={{
        background: "var(--bjhunt-2026-bg)",
        borderBottom: "1px solid var(--bjhunt-2026-border)",
      }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="grid grid-cols-1 items-end gap-10 md:grid-cols-[1fr_360px] md:gap-16"
        >
          <div>
            <motion.p
              variants={fadeUp}
              className="m-0 mb-4 font-mono uppercase"
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "var(--bjhunt-2026-text-muted)",
              }}
            >
              01 / Technology
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="m-0 mb-6"
              style={{
                fontFamily: "var(--bjhunt-2026-font-display)",
                fontSize: "clamp(40px, 5vw, 60px)",
                fontWeight: 400,
                lineHeight: 1.0,
                letterSpacing: "-0.025em",
                color: "var(--bjhunt-2026-text)",
              }}
            >
              La technologie
              <br />
              <em className="not-italic" style={{ color: "var(--bjhunt-2026-text-secondary)" }}>
                derriere BJHUNT.
              </em>
            </motion.h1>
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
              17 agents IA autonomes. Un cycle d&apos;attaque-defense continu.
              La cybersecurite du futur.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button asChild variant="ghost" size="md">
                <Link href="/technology/deep-dive">Explorer en detail →</Link>
              </Button>
            </motion.div>
          </div>

          <motion.div variants={fadeUp} className="hidden md:block">
            <NetworkTopologySVG className="h-48 w-full" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* MULTI-AGENT ORCHESTRATION ──────────────────────────────────────── */
function OrchestrationSection() {
  const ascii = `
                    ┌──────────────────┐
                    │   BJHUNT  CORE   │
                    │   ORCHESTRATEUR  │
                    └────────┬─────────┘
                             │
       ┌─────────┬───────────┼───────────┬─────────┐
       │         │           │           │         │
  ┌────┴────┐ ┌──┴───┐  ┌────┴────┐ ┌────┴────┐ ┌──┴────┐
  │ RECON   │ │EXPLT │  │ ANALYST │ │ CLOUD   │ │ DEFEN │
  └─────────┘ └──────┘  └─────────┘ └─────────┘ └───────┘
   recon       exploit   analyse     cloud      defense
`;

  return (
    <Section>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <SectionHeader
          eyebrow="02 / Architecture"
          title="Orchestration"
          highlight="Multi-agent."
          description="Nos 17 agents IA specialises travaillent ensemble comme une equipe de pentesters experimentes. Chaque agent maitrise un domaine : reconnaissance, exploitation, analyse, defense."
        />

        <motion.div variants={fadeUp} className="mt-10 md:mt-12">
          <MonoDiagram
            ascii={ascii}
            highlight={/BJHUNT  CORE/g}
            caption="HUB & SPOKE — 1 ORCHESTRATEUR · 5 SPECIALISTES"
          />
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-10 grid max-w-2xl grid-cols-3 gap-px"
          style={{ background: "var(--bjhunt-2026-border)" }}
        >
          {[
            { value: "17",   label: "AGENTS IA" },
            { value: "100+", label: "OUTILS" },
            { value: "24/7", label: "AUTONOME" },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="px-4 py-5 text-center sm:px-6"
              style={{ background: "var(--bjhunt-2026-bg-surface)" }}
            >
              <div
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
              </div>
              <div
                className="mt-2 font-mono uppercase"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  color: "var(--bjhunt-2026-text-muted)",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </Section>
  );
}

/* VACCINE LOOP ───────────────────────────────────────────────────── */
function VaccineLoopSection() {
  const ascii = `
        ┌─────────────┐         ┌─────────────┐
        │   ATTACK    │ ──────► │   BRIEF     │
        └─────────────┘         └──────┬──────┘
              ▲                        │
              │                        ▼
        ┌─────┴───────┐         ┌─────────────┐
        │   VERIFY    │ ◄────── │   DEFENSE   │
        └─────────────┘         └─────────────┘
`;

  return (
    <Section>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <SectionHeader
          eyebrow="03 / Processus"
          title="Le cycle"
          highlight="Vaccin."
          description="BJHUNT ne se contente pas de trouver les failles — il les corrige et verifie que la correction tient. Un cycle continu : Attaque → Defense → Verification."
        />

        <motion.div variants={fadeUp} className="mt-10 md:mt-12">
          <MonoDiagram
            ascii={ascii}
            highlight={/(ATTACK|BRIEF|DEFENSE|VERIFY)/g}
            caption="ATTACK → BRIEF → DEFENSE → VERIFY · BOUCLE FERMEE"
          />
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-6 max-w-md text-center"
          style={{
            fontSize: 13,
            fontWeight: 400,
            lineHeight: 1.6,
            color: "var(--bjhunt-2026-text-muted)",
          }}
        >
          Chaque vulnerabilite decouverte est automatiquement corrigee puis re-testee pour confirmer la correction.
        </motion.p>
      </motion.div>
    </Section>
  );
}

/* KNOWLEDGE GRAPH ────────────────────────────────────────────────── */
function KnowledgeGraphSection() {
  const legend: Array<{ state: "success" | "warning" | "critical" | "neutral"; label: string }> = [
    { state: "neutral",  label: "HOTES" },
    { state: "success",  label: "SERVICES" },
    { state: "critical", label: "VULNS" },
    { state: "warning",  label: "CREDENTIALS" },
  ];

  return (
    <Section>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <SectionHeader
          eyebrow="04 / Intelligence"
          title="Graphe de"
          highlight="Connaissances."
          description="Chaque decouverte enrichit un graphe de connaissances en temps reel. BJHUNT construit une carte complete de votre surface d'attaque et identifie les chaines d'exploitation les plus dangereuses."
        />

        <motion.div variants={fadeUp} className="mt-10 flex justify-center md:mt-12">
          <NetworkTopologySVG className="h-64 w-full max-w-2xl" />
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-6 flex flex-wrap items-center justify-center gap-6"
        >
          {legend.map(({ state, label }) => (
            <StatusDot key={label} state={state} label={label} mono />
          ))}
        </motion.div>
      </motion.div>
    </Section>
  );
}

/* SANDBOX ISOLATION ──────────────────────────────────────────────── */
function SandboxSection() {
  const ascii = `
                ┌──────────────────────────────────┐
                │       KALI LINUX SANDBOX         │
   TEST  ────►  │  ┌────────────────────────────┐  │  ────►  RESULTS
                │  │          [SHIELD]          │  │
                │  │   ISOLATED · EPHEMERAL     │  │
                │  └────────────────────────────┘  │
                └──────────────────────────────────┘

                  VOTRE INFRASTRUCTURE RESTE INTACTE
`;

  return (
    <Section>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <SectionHeader
          eyebrow="05 / Securite"
          title="Isolation"
          highlight="Totale."
          description="Chaque test s'execute dans un environnement Kali Linux isole. Aucun risque pour votre infrastructure de production. Tests destructifs possibles en toute securite."
        />

        <motion.div variants={fadeUp} className="mt-10 md:mt-12">
          <MonoDiagram
            ascii={ascii}
            highlight={/(KALI LINUX SANDBOX|TEST|RESULTS)/g}
            caption="ISOLATION RESEAU · CONTENEUR EPHEMERE · MIDDLEWARE WHITELIST"
          />
        </motion.div>
      </motion.div>
    </Section>
  );
}

/* CTA ────────────────────────────────────────────────────────────── */
function CTASection() {
  return (
    <section
      className="py-20 text-center md:py-24"
      style={{ background: "var(--bjhunt-2026-bg)" }}
    >
      <motion.div
        className="mx-auto flex w-full max-w-[860px] flex-col items-center gap-8 px-6 md:px-8"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2
          className="m-0"
          style={{
            fontFamily: "var(--bjhunt-2026-font-display)",
            fontSize: "clamp(28px, 3vw, 36px)",
            fontWeight: 400,
            lineHeight: 1.11,
            letterSpacing: "-0.025em",
            color: "var(--bjhunt-2026-text)",
          }}
        >
          Pret a securiser
          <br />
          <em
            className="not-italic"
            style={{ color: "var(--bjhunt-2026-text-secondary)" }}
          >
            votre entreprise ?
          </em>
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="ghost" size="md">
            <Link href="/beta">Rejoindre la beta</Link>
          </Button>
          <Button asChild variant="ghost" size="md">
            <Link href="/contact">Contacter l&apos;equipe →</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

export default function TechnologyPage() {
  return (
    <>
      <HeroSection />
      <OrchestrationSection />
      <VaccineLoopSection />
      <KnowledgeGraphSection />
      <SandboxSection />
      <CTASection />
    </>
  );
}
