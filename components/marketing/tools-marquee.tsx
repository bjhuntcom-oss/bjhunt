"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

export function ToolsMarquee() {
  const t = useTranslations("toolsRail");
  const tools = t.raw("tools") as string[];
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee) return;

    const items = marquee.querySelector("[data-marquee-items]");
    if (!items) return;

    const clone = items.cloneNode(true) as HTMLElement;
    clone.setAttribute("aria-hidden", "true");
    marquee.appendChild(clone);
  }, []);

  return (
    <section
      style={{
        background: "var(--bjhunt-bg)",
        borderTop: "1px solid var(--bjhunt-border)",
      }}
    >
      <div
        className="mx-auto w-full max-w-[1200px] px-6 md:px-8"
        style={{ paddingTop: "6.25rem", paddingBottom: "2rem" }}
      >
        <div className="mb-2">
          <span
            style={{
              fontFamily: "var(--bjhunt-font-mono-400)",
              fontSize: "11px",
              fontWeight: 400,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--bjhunt-text-muted)",
            }}
          >
            [ {t("eyebrow")} ]
          </span>
        </div>

        <h2
          style={{
            fontFamily: "var(--bjhunt-font-mono-700)",
            fontSize: "24px",
            fontWeight: 700,
            lineHeight: 1.3,
            textTransform: "uppercase",
            letterSpacing: "-0.02rem",
            color: "var(--bjhunt-text)",
            marginBottom: "1rem",
          }}
        >
          {t("title")}{" "}
          <span style={{ color: "var(--bjhunt-brand)" }}>
            {t("titleHighlight")}
          </span>
        </h2>

        <p
          className="mb-0"
          style={{
            maxWidth: "560px",
            fontFamily: "var(--bjhunt-font-sans)",
            fontSize: "14px",
            lineHeight: "20px",
            color: "var(--bjhunt-text-secondary)",
          }}
        >
          {t("description")}
        </p>
      </div>

      <div
        className="relative overflow-hidden"
        style={{
          borderTop: "1px solid var(--bjhunt-border)",
          borderBottom: "1px solid var(--bjhunt-border)",
          padding: "1.5rem 0",
        }}
      >
        <div
          ref={marqueeRef}
          className="marquee"
          style={{ display: "flex", gap: "48px" }}
        >
          <div
            data-marquee-items
            className="flex shrink-0"
            style={{ gap: "48px" }}
          >
            {tools.map((tool: string) => (
              <span
                key={tool}
                style={{
                  fontFamily: "var(--bjhunt-font-mono-500)",
                  fontSize: "13px",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--bjhunt-text-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}