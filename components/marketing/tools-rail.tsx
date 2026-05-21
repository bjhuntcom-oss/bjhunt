"use client";

const TRUSTED_BY = [
  "ORANGE CYBERDEFENSE",
  "THALES",
  "SOCIÉTÉ GÉNÉRALE",
  "AIRBUS",
  "BNP PARIBAS",
  "CAPGEMINI",
  "ATOS",
  "DASSAULT",
];

export function ToolsRail() {
  return (
    <section
      className="py-8"
      style={{
        background: "var(--bjhunt-bg)",
        borderTop: "1px solid var(--bjhunt-border)",
        borderBottom: "1px solid var(--bjhunt-border)",
      }}
    >
      <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-6 md:px-8">
        <div
          className="flex-1"
          style={{ height: "1px", background: "var(--bjhunt-border)" }}
        />
        <span
          style={{
            fontFamily: "var(--bjhunt-font-mono-400)",
            fontSize: "11px",
            fontWeight: 400,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--bjhunt-text-muted)",
            whiteSpace: "nowrap",
          }}
        >
          TRUSTED BY
        </span>
        <div
          className="flex-1"
          style={{ height: "1px", background: "var(--bjhunt-border)" }}
        />
      </div>

      <div className="mx-auto mt-6 flex max-w-[1200px] flex-wrap items-center justify-center gap-8 md:gap-12 px-6 md:px-8">
        {TRUSTED_BY.map((name) => (
          <span
            key={name}
            style={{
              fontFamily: "var(--bjhunt-font-mono-500)",
              fontSize: "12px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--bjhunt-text-muted)",
            }}
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}