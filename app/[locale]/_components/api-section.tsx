// app/[locale]/_components/api-section.tsx
"use client";

import { motion } from "framer-motion";
import { Terminal, type TerminalLine } from "@/components/ui/terminal";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const API_LINES: TerminalLine[] = [
  { type: "prompt",  content: 'curl -X POST https://api.bjhunt.com/v1/scan \\',    delay: 0   },
  { type: "output",  content: '  -H "Authorization: Bearer $API_KEY" \\',           delay: 100 },
  { type: "output",  content: '  -d \'{"target":"example.com","mode":"full"}\'',    delay: 100 },
  { type: "comment", content: "",                                                   delay: 500 },
  { type: "success", content: '{ "scan_id": "sc_8f3a2b", "status": "queued" }',    delay: 0   },
  { type: "comment", content: "",                                                   delay: 400 },
  { type: "prompt",  content: "bjhunt status sc_8f3a2b",                            delay: 0   },
  { type: "success", content: '{ "status": "complete", "critical": 0, "medium": 2 }', delay: 700 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export function APISection() {
  const t = useTranslations("api_section");

  return (
    <section
      className="relative overflow-hidden px-8 py-28 md:px-12 lg:px-16"
      style={{
        borderTop: "1px solid var(--bjhunt-border)",
        borderBottom: "1px solid var(--bjhunt-border)",
        background:
          "radial-gradient(ellipse 50% 40% at 80% 50%, rgba(99,102,241,0.04), transparent 60%)",
      }}
    >
      <div className="relative z-10 mx-auto grid max-w-[1680px] grid-cols-1 items-start gap-16 lg:grid-cols-2 lg:gap-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="flex flex-col gap-7"
        >
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--bjhunt-text-subtle)]">
            03 / API Surface
          </p>
          <h2 className="m-0 font-extralight text-[clamp(36px,5vw,56px)] tracking-[-0.03em] leading-[1.0]">
            {t("title")}
          </h2>
          <p className="m-0 max-w-[520px] font-light text-[16px] leading-[1.65] text-[var(--bjhunt-text-muted)]">
            {t("subtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/api-docs"
              className="inline-flex items-center gap-2.5 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--bjhunt-text)] border border-[var(--bjhunt-border-strong)] bg-white/[0.02] hover:bg-white/[0.05] transition-colors duration-200"
            >
              {t("cta")}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="border border-[var(--bjhunt-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.012),rgba(255,255,255,0.002))] backdrop-blur-2xl"
        >
          <Terminal lines={API_LINES} autoPlay />
        </motion.div>
      </div>
    </section>
  );
}
