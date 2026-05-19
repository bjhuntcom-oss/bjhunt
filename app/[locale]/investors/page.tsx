"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export default function InvestorsPage() {
  return (
    <div style={{ background: "var(--bjhunt-bg)" }}>
      <section className="py-16 md:py-24" style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
            <motion.p variants={fadeUp} className="mb-4 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
              Investors
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="m-0"
              style={{
                fontFamily: "var(--bjhunt-font-display)",
                fontSize: "clamp(40px, 5vw, 60px)",
                fontWeight: 400,
                lineHeight: 1.0,
                letterSpacing: "-0.025em",
                color: "var(--bjhunt-text)",
              }}
            >
              Invest in the
              <br />
              <span style={{ color: "var(--bjhunt-brand)" }}>AI-first security.</span>
            </motion.h1>
          </motion.div>
        </div>
      </section>

      <section style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: "var(--bjhunt-border)" }}>
            {[
              { value: "2026", label: "LAUNCH" },
              { value: "Beta", label: "CURRENT PHASE" },
              { value: "10B€", label: "ADDRESSABLE MARKET" },
              { value: "0", label: "FALSE POSITIVES" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col gap-1 p-6 md:p-8" style={{ background: "var(--bjhunt-bg)" }}>
                <span className="font-mono text-[clamp(24px,3vw,32px)] font-semibold leading-none tracking-[-0.02em] text-bjhunt-brand">
                  {value}
                </span>
                <span className="text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-bjhunt-text-muted">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div className="mx-auto w-full max-w-[1280px] py-12 px-6 md:px-8 md:py-16 lg:px-12">
          <p className="mb-4 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
            Why BJHUNT
          </p>
          <h2 className="font-display font-semibold text-[clamp(22px,2.4vw,24px)] leading-[1.33] tracking-[-0.025em] text-bjhunt-text mb-6 m-0">
            The AI security market is evolving.<br />We are ahead.
          </h2>
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {[
              "Real-time CVE detection without agents",
              "API-first, native CI/CD integration",
              "Zero false positives with proprietary AI model",
            ].map((point) => (
              <li key={point} className="flex items-start gap-3">
                <StatusDot state="success" />
                <span className="text-[14px] font-sans font-normal leading-[1.6] text-bjhunt-text-secondary">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-4 px-6 md:px-8 lg:px-12">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
            Investor Contact
          </p>
          <h2 className="font-display font-semibold text-[clamp(22px,2.4vw,24px)] leading-[1.33] tracking-[-0.025em] text-bjhunt-text m-0">
            Interested in BJHUNT?
          </h2>
          <Button asChild variant="ghost" size="md">
            <a href="mailto:partner@bjhunt.com">Contact the team →</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
