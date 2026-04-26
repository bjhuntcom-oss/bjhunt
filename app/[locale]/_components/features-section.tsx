// app/[locale]/_components/features-section.tsx
//
// BJHUNT 2026 refonte — spec card (#101010 + 1px #3d3a39 + radius 8px),
// mono label grids replacing the gradient halo illustrations.
// Per docs/refonte-2026/DESIGN-SYSTEM-2026.md §7 (Card), §9 (illustrations).

"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
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

type DotState = "success" | "warning" | "critical";

interface MonoListRow {
  num: string;
  path: string;
  label: string;
  state: DotState;
}

interface FeatureCardProps {
  idx: string;
  tag: string;
  title: string;
  description: string;
  rows: MonoListRow[];
  showTopology?: boolean;
}

function FeatureCard({ idx, tag, title, description, rows, showTopology = false }: FeatureCardProps) {
  return (
    <motion.article
      variants={fadeUp}
      className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-[1fr_1fr] md:gap-10"
    >
      {/* Left — copy block */}
      <div
        className="flex flex-col gap-5 p-6 md:p-8"
        style={{
          background: "var(--bjhunt-2026-bg-surface)",
          border: "1px solid var(--bjhunt-2026-border)",
          borderRadius: 8,
        }}
      >
        <header className="flex items-center justify-between">
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-2026-text-muted)",
            }}
          >
            {idx}
          </span>
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-2026-text)",
            }}
          >
            {tag}
          </span>
        </header>

        <h3
          className="m-0"
          style={{
            fontFamily: "var(--bjhunt-2026-font-display)",
            fontSize: "clamp(22px, 2.4vw, 24px)",
            fontWeight: 600,
            lineHeight: 1.33,
            letterSpacing: "-0.025em",
            color: "var(--bjhunt-2026-text)",
          }}
        >
          {title}
        </h3>

        <p
          className="m-0"
          style={{
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.6,
            color: "var(--bjhunt-2026-text-secondary)",
          }}
        >
          {description}
        </p>
      </div>

      {/* Right — mono label grid (replaces gradient halo) */}
      <div
        className="flex flex-col"
        style={{
          background: "var(--bjhunt-2026-bg-surface)",
          border: "1px solid var(--bjhunt-2026-border)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {showTopology ? (
          <div className="flex items-center justify-center px-6 pt-6 pb-2">
            <NetworkTopologySVG className="h-32 w-full max-w-[360px]" />
          </div>
        ) : null}

        <ul className="m-0 flex flex-col" style={{ listStyle: "none", padding: 0 }}>
          {rows.map((row, i) => (
            <li
              key={row.num + row.path}
              className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-5 py-3"
              style={{
                borderTop:
                  i === 0 && !showTopology
                    ? "none"
                    : "1px solid var(--bjhunt-2026-border)",
                fontFamily: "var(--bjhunt-2026-font-mono)",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: "var(--bjhunt-2026-text-muted)" }}>[{row.num}]</span>
              <span
                className="truncate"
                style={{ color: "var(--bjhunt-2026-text)" }}
                title={row.path}
              >
                {row.path}
              </span>
              <span
                className="uppercase"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  color:
                    row.state === "critical"
                      ? "var(--state-critical)"
                      : row.state === "warning"
                      ? "var(--state-warning)"
                      : "var(--state-success)",
                }}
              >
                {row.label}
              </span>
              <StatusDot state={row.state} />
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  );
}

export function FeaturesSection() {
  const t = useTranslations("features");

  return (
    <section
      className="py-16 md:py-24"
      style={{ background: "var(--bjhunt-2026-bg)" }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
        <motion.header
          className="mb-10 max-w-2xl md:mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
        >
          <p
            className="m-0 mb-4 font-mono uppercase"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-2026-text-muted)",
            }}
          >
            02 / Capabilities
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
            className="mt-4"
            style={{
              fontSize: 16,
              fontWeight: 400,
              lineHeight: 1.6,
              color: "var(--bjhunt-2026-text-secondary)",
            }}
          >
            {t("subtitle")}
          </p>
        </motion.header>

        <div className="flex flex-col gap-8 sm:gap-10 md:gap-12">
          <FeatureCard
            idx="A1"
            tag="DETECTION"
            title={t("scan_title")}
            description={t("scan_desc")}
            showTopology
            rows={[
              { num: "01", path: "/api/users",  label: "SQLi", state: "critical" },
              { num: "02", path: "/api/search", label: "XSS",  state: "critical" },
              { num: "03", path: "/api/upload", label: "SSRF", state: "warning"  },
            ]}
          />
          <FeatureCard
            idx="A2"
            tag="CVE"
            title={t("cve_title")}
            description={t("cve_desc")}
            rows={[
              { num: "01", path: "CVE-2024-3094  · liblzma",     label: "9.8 CRIT", state: "critical" },
              { num: "02", path: "CVE-2024-21626 · runc",        label: "8.6 HIGH", state: "critical" },
              { num: "03", path: "CVE-2024-1086  · netfilter",   label: "7.8 HIGH", state: "warning"  },
              { num: "04", path: "CVE-2023-50164 · struts2",     label: "9.8 CRIT", state: "critical" },
            ]}
          />
          <FeatureCard
            idx="A3"
            tag="INFRASTRUCTURE"
            title={t("infra_title")}
            description={t("infra_desc")}
            rows={[
              { num: "01", path: "sandbox-01.bjhunt.local", label: "ISOLATED", state: "success" },
              { num: "02", path: "kali-runner @ 10.4.2.7",  label: "RUNNING",  state: "success" },
              { num: "03", path: "tls 1.3 · mTLS pinned",   label: "VERIFIED", state: "success" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
