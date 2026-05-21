"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const isDev = process.env.NODE_ENV !== "production";

  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)" }}
    >
      <div
        className="w-full max-w-lg text-center p-8 rounded-[6px]"
        style={{
          background: "var(--bjhunt-bg-surface)",
          border: "1px solid var(--bjhunt-border)",
        }}
      >
        <p
          className="m-0"
          style={{
            fontSize: 11,
            fontFamily: "var(--bjhunt-font-mono)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "var(--bjhunt-critical)",
          }}
        >
          ERROR / 500
        </p>
        <h1
          className="mt-4 mb-4 m-0"
          style={{
            fontSize: "clamp(28px, 3vw, 36px)",
            fontWeight: 700,
            lineHeight: 1.11,
            letterSpacing: "-0.025em",
          }}
        >
          {t("title")}
        </h1>
        <p className="m-0 text-[14px] leading-[1.6] mb-8" style={{ color: "var(--bjhunt-text-muted)" }}>
          {t("description")}
        </p>

        {isDev && error?.message && (
          <pre
            className="text-left mb-8 p-4 overflow-x-auto rounded-[6px] m-0"
            style={{
              background: "#0a0a0a",
              border: "1px solid var(--bjhunt-border)",
              color: "var(--bjhunt-critical)",
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {error.message}
            {error.digest && `\n\ndigest: ${error.digest}`}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 h-10 font-medium text-[14px] rounded-[6px] transition-colors cursor-pointer"
            style={{
              color: "var(--bjhunt-text-inverted)",
              background: "var(--bjhunt-brand)",
              border: "none",
            }}
          >
            {t("tryAgain")}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 h-10 font-medium text-[14px] rounded-[6px] transition-colors no-underline"
            style={{
              color: "var(--bjhunt-text)",
              border: "1px solid var(--bjhunt-border)",
            }}
          >
            {t("backHome")}
          </Link>
        </div>

        <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--bjhunt-border)" }}>
          <p className="m-0 text-[13px]" style={{ color: "var(--bjhunt-text-muted)" }}>
            {t("support")}{" "}
            <a
              href="mailto:support@bjhunt.com"
              style={{ color: "var(--bjhunt-brand)", textDecoration: "underline", textUnderlineOffset: 2 }}
            >
              support@bjhunt.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
