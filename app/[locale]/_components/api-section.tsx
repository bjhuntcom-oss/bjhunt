// app/[locale]/_components/api-section.tsx
"use client";

import { motion } from "framer-motion";
import { Terminal, type TerminalLine } from "@/components/ui/terminal";
import { APICircuitSVG } from "@/components/animations/api-circuit";
import { SectionLabel } from "@/components/ui/section-label";
import { Button } from "@/components/ui/button";
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
    <section className="bg-[var(--bg-card)] border-y border-[var(--border)] py-24 px-8 md:px-12 overflow-hidden relative">
      <APICircuitSVG className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" />

      <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="flex flex-col gap-6"
        >
          <SectionLabel>API REST</SectionLabel>
          <h2 className="text-4xl font-black tracking-[-0.03em]">{t("title")}</h2>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-sm">{t("subtitle")}</p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/api-docs">{t("cta")}</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          <Terminal lines={API_LINES} autoPlay />
        </motion.div>
      </div>
    </section>
  );
}
