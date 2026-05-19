"use client";

import { motion } from "framer-motion";

interface Stat {
  value: string;
  label: string;
}

interface StatsSectionProps {
  stats: Stat[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number]},
  },
};

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-px lg:grid-cols-4"
      style={{ background: "var(--bjhunt-border)" }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          variants={fadeUp}
          className="flex flex-col gap-2 p-6 md:p-8"
          style={{ background: "var(--bjhunt-bg-surface)" }}
        >
          <span
            className="tabular-nums"
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: "clamp(24px, 3vw, 32px)",
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "var(--bjhunt-brand)",
            }}
          >
            {stat.value}
          </span>
          <span className="text-[13px] font-sans font-normal leading-[1.5] text-bjhunt-text-secondary">
            {stat.label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}
