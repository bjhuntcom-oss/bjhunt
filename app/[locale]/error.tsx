"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Eyebrow, H1, Body, Code } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
      style={{
        backgroundColor: "var(--bjhunt-bg)",
        color: "var(--bjhunt-text)",
      }}
    >
      <Card padding="loose" className="w-full max-w-lg text-center">
        <Eyebrow className="text-[var(--state-critical)]">
          ERREUR / 500
        </Eyebrow>

        <H1 className="mt-4 mb-4">{t("serverError.title")}</H1>

        <Body className="text-[var(--bjhunt-text-muted)] leading-[1.6] mb-8">
          {t("serverError.description")}
        </Body>

        {isDev && error?.message && (
          <pre
            className="text-left mb-8 p-4 rounded-[var(--bjhunt-radius)] overflow-x-auto text-[12px] leading-[1.5]"
            style={{
              backgroundColor: "var(--bjhunt-bg-surface)",
              border: "1px solid var(--bjhunt-border)",
              fontFamily: "var(--bjhunt-font-mono)",
              color: "var(--state-critical)",
            }}
          >
            <Code className="text-[var(--state-critical)]">
              {error.message}
              {error.digest && `\n\ndigest: ${error.digest}`}
              {error.stack && `\n\n${error.stack}`}
            </Code>
          </pre>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="state"
            state="success"
            size="lg"
            onClick={reset}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t("serverError.tryAgain")}
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/">{t("serverError.backHome")}</Link>
          </Button>
        </div>

        <div
          className="mt-10 pt-6 text-[13px]"
          style={{ borderTop: "1px solid var(--bjhunt-border)" }}
        >
          <Body className="text-[var(--bjhunt-text-muted)]">
            {t("serverError.support")}{" "}
            <a
              href="mailto:support@bjhunt.com"
              className="text-[var(--state-success)] underline underline-offset-2 hover:no-underline"
            >
              support@bjhunt.com
            </a>
          </Body>
        </div>
      </Card>
    </main>
  );
}
