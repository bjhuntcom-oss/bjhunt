"use client";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bjhunt-bg)" }}>
      <div className="flex flex-col items-center gap-5">
        <div
          aria-hidden
          className="animate-spin"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "2px solid var(--bjhunt-border)",
            borderTopColor: "var(--bjhunt-brand)",
            animationDuration: "0.8s",
          }}
        />
        <p
          className="m-0 uppercase"
          style={{
            fontFamily: "var(--bjhunt-font-mono)",
            fontSize: 12,
            letterSpacing: "0.18em",
            color: "var(--bjhunt-text-muted)",
          }}
        >
          Loading
        </p>
      </div>
    </div>
  );
}
