"use client";

import { useTranslations } from "next-intl";

export function AnnouncementBanner() {
  const t = useTranslations("hero");

  return (
    <div
      style={{
        background: "#ffffff",
        color: "#000000",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--bjhunt-font-mono)",
        fontSize: "12px",
        fontWeight: 500,
        letterSpacing: "0.05em",
        gap: "8px",
        borderBottom: "1px solid var(--bjhunt-border)",
      }}
    >
      <span style={{ color: "#f80" }}>***</span>
      <span>{t("announcement")}</span>
      <span style={{ color: "#f80" }}>***</span>
    </div>
  );
}
