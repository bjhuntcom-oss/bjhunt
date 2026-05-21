"use client";

import { useTranslations } from "next-intl";

export function AnnouncementBanner() {
  const t = useTranslations("hero");

  return (
    <div
      style={{
        background: "#000",
        color: "#fff",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--bjhunt-font-mono)",
        fontSize: "12px",
        fontWeight: 500,
        letterSpacing: "0.05em",
        gap: "8px",
      }}
    >
      <span style={{ color: "#f80" }}>***</span>
      <span>{t("announcement")}</span>
      <span style={{ color: "#f80" }}>***</span>
    </div>
  );
}
