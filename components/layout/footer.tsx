"use client";

import { Link } from "@/i18n/routing";
import { LogoSymbol, LogoWordmark } from "@/components/ui/logo";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t" style={{ background: "var(--bjhunt-bg)", borderColor: "var(--bjhunt-border)" }}>
      <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-8 md:py-16 lg:px-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <LogoSymbol size={20} />
              <LogoWordmark className="text-[14px]" />
            </div>
            <p className="text-[13px] font-sans leading-[1.6] text-bjhunt-text-secondary mb-6">
              {t("tagline")}
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="mb-4 text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-bjhunt-text-muted">
              {t("nav.label")}
            </p>
            <nav className="flex flex-col gap-2.5">
              <Link href="/" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("nav.home")}
              </Link>
              <Link href="/technology" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("nav.technology")}
              </Link>
              <Link href="/pricing" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("nav.pricing")}
              </Link>
              <Link href="/about" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("nav.about")}
              </Link>
              <Link href="/contact" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("nav.contact")}
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div>
            <p className="mb-4 text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-bjhunt-text-muted">
              {t("resources.label")}
            </p>
            <nav className="flex flex-col gap-2.5">
              <Link href="/api-docs" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("resources.apiDocs")}
              </Link>
              <Link href="/security" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("resources.security")}
              </Link>
              <Link href="/contact" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("contact.label")}
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-4 text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-bjhunt-text-muted">
              {t("legal.label")}
            </p>
            <nav className="flex flex-col gap-2.5">
              <Link href="/legal" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("legal.terms")}
              </Link>
              <Link href="/legal" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("legal.privacy")}
              </Link>
              <Link href="/legal" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("legal.gdpr")}
              </Link>
              <Link href="/legal" className="text-[12px] font-mono text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors">
                {t("legal.legalNotice")}
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t px-6 py-4 md:px-8 lg:px-12" style={{ borderColor: "var(--bjhunt-border)" }}>
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 text-[10px] font-mono text-bjhunt-text-muted">
          <span>© {year} {t("copyright")}</span>
          <div className="flex-1" />
          <span className="hidden sm:block">{t("period")}</span>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-[5px] w-[5px] rounded-full"
              style={{ background: "var(--bjhunt-success)" }}
              aria-hidden
            />
            <span className="uppercase tracking-[0.15em] text-bjhunt-success">{t("active")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
