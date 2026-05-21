"use client";

import { Link } from "@/i18n/routing";
import { LogoSymbol, LogoWordmark } from "@/components/ui/logo";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t" style={{ background: "var(--bjhunt-bg)", borderColor: "var(--bjhunt-border)" }}>
      <div className="mx-auto max-w-[1280px] px-6 pt-16 pb-8 md:px-8 lg:px-12">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <LogoSymbol size={20} />
              <LogoWordmark />
            </div>
            <p className="text-[14px] leading-[1.6] text-bjhunt-text-secondary">
              {t("tagline")}
            </p>
          </div>

          <div>
            <p className="mb-4 text-[12px] font-semibold text-bjhunt-text-muted">
              {t("nav.label")}
            </p>
            <nav className="flex flex-col gap-3">
              <Link href="/" className="text-[14px] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">{t("nav.home")}</Link>
              <Link href="/technology" className="text-[14px] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">{t("nav.technology")}</Link>
              <Link href="/pricing" className="text-[14px] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">{t("nav.pricing")}</Link>
              <Link href="/about" className="text-[14px] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">{t("nav.about")}</Link>
              <Link href="/contact" className="text-[14px] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">{t("nav.contact")}</Link>
            </nav>
          </div>

          <div>
            <p className="mb-4 text-[12px] font-semibold text-bjhunt-text-muted">
              {t("resources.label")}
            </p>
            <nav className="flex flex-col gap-3">
              <Link href="/api-docs" className="text-[14px] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">{t("resources.apiDocs")}</Link>
              <Link href="/security" className="text-[14px] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">{t("resources.security")}</Link>
            </nav>
          </div>

          <div>
            <p className="mb-4 text-[12px] font-semibold text-bjhunt-text-muted">
              {t("legal.label")}
            </p>
            <nav className="flex flex-col gap-3">
              <Link href="/legal" className="text-[14px] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">{t("legal.terms")}</Link>
              <Link href="/legal" className="text-[14px] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">{t("legal.privacy")}</Link>
              <Link href="/legal" className="text-[14px] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">{t("legal.gdpr")}</Link>
              <Link href="/legal" className="text-[14px] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">{t("legal.legalNotice")}</Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="border-t px-6 py-4 md:px-8 lg:px-12" style={{ borderColor: "var(--bjhunt-border)" }}>
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 text-[13px] text-bjhunt-text-muted">
          <span>&copy; {year} {t("copyright")}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: "var(--bjhunt-success)" }} aria-hidden />
            <span className="font-semibold text-bjhunt-success">{t("active")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
