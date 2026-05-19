"use client";

import { motion } from "framer-motion";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  highlight?: string;
  description?: string;
  align?: "left" | "center";
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number]},
  },
};

export function SectionHeader({
  eyebrow,
  title,
  highlight,
  description,
  align = "left",
}: SectionHeaderProps) {
  return (
    <motion.header
      className={`mb-12 ${align === "center" ? "text-center" : ""} ${align === "center" ? "mx-auto" : "max-w-2xl"}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
    >
      <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted mb-4">
        {eyebrow}
      </p>
      <h2 className="text-[clamp(28px,3vw,40px)] font-display font-normal leading-[1.08] tracking-[-0.025em] text-bjhunt-text m-0">
        {title}{" "}
        {highlight && (
          <span className="text-bjhunt-brand">{highlight}</span>
        )}
      </h2>
      {description && (
        <p className="mt-4 text-[16px] font-sans font-normal leading-[1.6] text-bjhunt-text-secondary max-w-[560px]">
          {description}
        </p>
      )}
    </motion.header>
  );
}
