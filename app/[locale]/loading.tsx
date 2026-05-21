"use client";

export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--bjhunt-bg)" }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6L12 12L4 18"
              stroke="var(--bjhunt-brand)"
              strokeWidth="2.5"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
            <path
              d="M12 6L20 12L12 18"
              stroke="var(--bjhunt-text)"
              strokeWidth="2.5"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
          <span
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "var(--bjhunt-text)",
            }}
          >
            BJHUNT
          </span>
        </div>

        {/* Terminal-style loading */}
        <div
          className="flex items-center gap-2 px-4 py-2"
          style={{
            background: "var(--bjhunt-bg-surface)",
            border: "1px solid var(--bjhunt-border)",
            fontFamily: "var(--bjhunt-font-mono)",
            fontSize: "11px",
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ color: "var(--bjhunt-text-muted)" }}>$</span>
          <span style={{ color: "var(--bjhunt-text)" }}>initializing</span>
          <span className="animate-pulse" style={{ color: "var(--bjhunt-brand)" }}>
            _
          </span>
        </div>
      </div>
    </div>
  );
}
