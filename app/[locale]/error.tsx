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
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-bjhunt-bg text-bjhunt-text">
      <Card padding="loose" className="w-full max-w-lg text-center">
        <Eyebrow className="text-bjhunt-critical">ERROR / 500</Eyebrow>
        <H1 className="mt-4 mb-4">{t("title")}</H1>
        <Body className="text-bjhunt-text-muted leading-[1.6] mb-8">{t("description")}</Body>

        {isDev && error?.message && (
          <pre className="text-left mb-8 p-4 rounded-md overflow-x-auto text-[12px] leading-[1.5] bg-bjhunt-bg border border-bjhunt-border font-mono text-bjhunt-critical">
            <Code className="text-bjhunt-critical">
              {error.message}
              {error.digest && `\n\ndigest: ${error.digest}`}
              {error.stack && `\n\n${error.stack}`}
            </Code>
          </pre>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="state" state="success" size="lg" onClick={reset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {t("tryAgain")}
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </div>

        <div className="mt-10 pt-6 border-t border-bjhunt-border text-[13px]">
          <Body className="text-bjhunt-text-muted">
            {t("support")}{" "}
            <a href="mailto:support@bjhunt.com" className="text-bjhunt-brand underline underline-offset-2 hover:no-underline">
              support@bjhunt.com
            </a>
          </Body>
        </div>
      </Card>
    </main>
  );
}
