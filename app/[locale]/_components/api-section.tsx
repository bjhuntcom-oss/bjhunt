// app/[locale]/_components/api-section.tsx
//
// BJHUNT 2026 refonte — hairline terminal block, no backdrop blur,
// ghost button per spec §7. Token-pinned colors only.

"use client";

import { motion } from "framer-motion";
import { Terminal, type TerminalLine } from "@/components/ui/terminal";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const API_LINES: TerminalLine[] = [
  { type: "prompt",  content: "curl -X POST https://api.bjhunt.com/v1/scan \\",     delay: 0   },
  { type: "output",  content: '  -H "Authorization: Bearer $API_KEY" \\',           delay: 100 },
  { type: "output",  content: "  -d '{\"target\":\"example.com\",\"mode\":\"full\"}'", delay: 100 },
  { type: "comment", content: "",                                                   delay: 500 },
  { type: "success", content: '{ "scan_id": "sc_8f3a2b", "status": "queued" }',     delay: 0   },
  { type: "comment", content: "",                                                   delay: 400 },
  { type: "prompt",  content: "bjhunt status sc_8f3a2b",                            delay: 0   },
  { type: "success", content: '{ "status": "complete", "critical": 0, "medium": 2 }', delay: 700 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export function APISection() {
  const t = useTranslations("api_section");

  return (
    <section
      className="py-16 md:py-24"
      style={{
        background: "var(--bjhunt-2026-bg)",
        borderTop: "1px solid var(--bjhunt-2026-border)",
        borderBottom: "1px solid var(--bjhunt-2026-border)",
      }}
    >
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-start gap-10 px-6 sm:gap-12 md:grid-cols-2 md:gap-16 md:px-8 lg:px-12">
        {/* Left — copy */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="flex flex-col gap-5"
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
            03 / API Surface
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
            {t("title")}
          </h2>
          <p
            className="m-0 max-w-[520px]"
            style={{
              fontSize: 16,
              fontWeight: 400,
              lineHeight: 1.6,
              color: "var(--bjhunt-2026-text-secondary)",
            }}
          >
            {t("subtitle")}
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="ghost" size="md">
              <Link href="/api-docs">{t("cta")} →</Link>
            </Button>
          </div>
        </motion.div>

        {/* Right — terminal block, no blur */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: "var(--bjhunt-2026-bg-surface)",
            border: "1px solid var(--bjhunt-2026-border)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <Terminal lines={API_LINES} autoPlay />
        </motion.div>
      </div>
    </section>
  );
}
