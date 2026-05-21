"use client";

import { useTranslations } from "next-intl";

export function HomeStats() {
  const t = useTranslations("stats");

  const stats = [
    { value: t("stat1.value"), label: t("stat1.label") },
    { value: t("stat2.value"), label: t("stat2.label") },
    { value: t("stat3.value"), label: t("stat3.label") },
    { value: t("stat4.value"), label: t("stat4.label") },
  ];

  return (
    <section
      style={{
        background: "#0a0a0a",
        height: "7.5rem",
        borderTop: "1px solid #292929",
      }}
    >
      <div
        className="mx-auto flex h-full max-w-[1200px] items-stretch"
        style={{ padding: "0 1.5rem" }}
      >
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="flex flex-1 flex-col items-center justify-center"
            style={{
              borderLeft: i > 0 ? "1px solid #292929" : "none",
            }}
          >
            <span
              style={{
                fontFamily: "var(--bjhunt-font-mono-700)",
                fontSize: "clamp(24px, 3vw, 40px)",
                fontWeight: 700,
                lineHeight: 1,
                color: "#fff",
                textTransform: "uppercase",
              }}
              className="tabular-nums"
            >
              {stat.value}
            </span>
            <span
              style={{
                fontFamily: "var(--bjhunt-font-sans)",
                fontSize: "13px",
                lineHeight: "18px",
                color: "#999",
                textAlign: "center",
                marginTop: "4px",
                maxWidth: "160px",
              }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}