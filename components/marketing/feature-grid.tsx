"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { LucideIcon } from "lucide-react";

interface FeatureCardData {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeatureGridProps {
  cards: FeatureCardData[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number]},
  },
};

export function FeatureGrid({ cards }: FeatureGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3"
      style={{ background: "var(--bjhunt-border)" }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {cards.map((card) => (
        <motion.div
          key={card.title}
          variants={fadeUp}
          className="flex flex-col gap-4 p-8"
          style={{ background: "var(--bjhunt-bg-surface)" }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              background: "var(--bjhunt-brand-soft)",
              color: "var(--bjhunt-brand)",
            }}
          >
            <card.icon className="h-5 w-5" />
          </div>
          <h3 className="text-[18px] font-sans font-semibold leading-[1.3] tracking-[-0.01em] text-bjhunt-text m-0">
            {card.title}
          </h3>
          <p className="text-[14px] font-sans font-normal leading-[1.6] text-bjhunt-text-secondary m-0">
            {card.description}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}
