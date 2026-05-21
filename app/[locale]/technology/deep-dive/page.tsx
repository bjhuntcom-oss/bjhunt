import { Link } from "@/i18n/routing";

export default function DeepDivePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16" style={{ background: "var(--bjhunt-bg)" }}>
      <div className="text-center max-w-lg">
        <p className="mb-4 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
          [DEEP DIVE]
        </p>
        <h1
          className="m-0 mb-4"
          style={{
            fontSize: "clamp(28px, 3vw, 36px)",
            fontWeight: 400,
            lineHeight: 1.11,
            letterSpacing: "-0.025em",
            color: "var(--bjhunt-text)",
          }}
        >
          Technology Deep Dive
        </h1>
        <p className="m-0 mb-8 font-sans text-[16px] leading-[1.6] text-bjhunt-text-muted">
          This page has been simplified. Visit the main technology page for an overview of our architecture.
        </p>
        <Link
          href="/technology"
          className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] transition-colors"
          style={{ color: "var(--bjhunt-text-muted)" }}
        >
          ← Back to Technology
        </Link>
      </div>
    </div>
  );
}
