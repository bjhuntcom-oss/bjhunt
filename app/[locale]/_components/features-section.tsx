// app/[locale]/_components/features-section.tsx
"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { NetworkTopologySVG } from "@/components/animations/network-topology";
import { CVEHeatmapSVG } from "@/components/animations/cve-heatmap";
import { IsometricServerSVG } from "@/components/animations/isometric-server";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

interface W8FeatureProps {
  idx: string;
  tag: string;
  title: string;
  description: string;
  illustration: React.ReactNode;
  accent?: string; // rgb triplet for accent halo
}

function W8Feature({ idx, tag, title, description, illustration, accent = "99,102,241" }: W8FeatureProps) {
  return (
    <motion.article
      variants={fadeUp}
      className="grid grid-cols-1 gap-10 py-14 md:grid-cols-[280px_1fr] md:gap-20"
      style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
    >
      <div>
        <div
          className="mb-5 font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: "0.32em",
            color: "var(--bjhunt-text-disabled)",
          }}
        >
          {idx}
        </div>
        <h3
          className="m-0 mb-5"
          style={{
            fontSize: 36,
            fontWeight: 200,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "var(--bjhunt-text)",
          }}
        >
          {title}
        </h3>
        <span
          className="mb-5 inline-flex items-center gap-2 px-2.5 py-1 font-mono uppercase"
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            color: `rgb(${accent})`,
            background: `rgba(${accent},0.08)`,
            border: `1px solid rgba(${accent},0.20)`,
          }}
        >
          {tag}
        </span>
        <p
          className="m-0"
          style={{
            color: "var(--bjhunt-text-muted)",
            fontSize: 13,
            lineHeight: 1.65,
            fontWeight: 300,
          }}
        >
          {description}
        </p>
      </div>

      <div
        className="relative flex min-h-[260px] items-center justify-center overflow-hidden p-10"
        style={{
          border: "1px solid var(--bjhunt-border)",
          background:
            `linear-gradient(180deg, rgba(255,255,255,0.012), rgba(255,255,255,0.002)),`
            + `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(${accent},0.05), transparent 70%)`,
          backdropFilter: "blur(24px) saturate(140%)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
        }}
      >
        {illustration}
      </div>
    </motion.article>
  );
}

export function FeaturesSection() {
  const t = useTranslations("features");

  return (
    <section className="px-8 py-24 md:px-12 lg:px-16">
      <motion.header
        className="mb-16 max-w-2xl"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        <p
          className="m-0 mb-6 font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: "0.32em",
            color: "var(--bjhunt-text-subtle)",
          }}
        >
          {/* TODO i18n: features.eyebrow */}
          02 / Capabilities
        </p>
        <h2
          className="m-0"
          style={{
            fontSize: "clamp(40px, 6vw, 64px)",
            fontWeight: 200,
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
          }}
        >
          {t("title")}
        </h2>
        <p
          className="mt-6"
          style={{ color: "var(--bjhunt-text-muted)", fontSize: 17, lineHeight: 1.6, fontWeight: 300 }}
        >
          {t("subtitle")}
        </p>
      </motion.header>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        style={{ borderTop: "1px solid var(--bjhunt-border)" }}
      >
        <W8Feature
          idx="A1"
          tag="Détection"
          title={t("scan_title")}
          description={t("scan_desc")}
          illustration={<NetworkTopologySVG className="h-44 w-full" />}
          accent="99,102,241"
        />
        <W8Feature
          idx="A2"
          tag="CVE"
          title={t("cve_title")}
          description={t("cve_desc")}
          illustration={<CVEHeatmapSVG className="h-44 w-full" />}
          accent="255,159,10"
        />
        <W8Feature
          idx="A3"
          tag="Infrastructure"
          title={t("infra_title")}
          description={t("infra_desc")}
          illustration={<IsometricServerSVG className="h-32 w-32" />}
          accent="100,210,255"
        />
      </motion.div>
    </section>
  );
}
