"use client";

import { Link } from "@/i18n/routing";
import { LogoSymbol, LogoWordmark } from "@/components/ui/logo";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--bg)] border-t border-[var(--border)]">

      {/* ── NAV COLUMNS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[var(--border)] divide-x divide-[var(--border)]">

        {/* Navigation */}
        <div className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <LogoSymbol size={20} />
            <LogoWordmark className="text-[14px]" />
          </div>
          <nav className="flex flex-col gap-3">
            {[
              { href: "/",           label: t("home") },
              { href: "/pricing",    label: t("pricing") },
              { href: "/api-docs",   label: "API" },
              { href: "/investors",  label: t("investors") },
              { href: "/contact",    label: t("contactLink") },
              { href: "/legal",      label: t("legal") },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[11px] text-[var(--text-muted)] hover:text-white transition-colors font-mono"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Developers / Développeurs */}
        <div className="p-8">
          <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-5 font-mono">{t("developers")}</p>
          <div className="flex flex-col gap-3">
            {[
              { href: "/api-docs",           label: t("apiDocs") },
              { href: "/api-docs#auth",      label: t("apiAuth") },
              { href: "/api-docs#endpoints", label: t("apiEndpoints") },
              { href: "/api-docs#webhooks",  label: t("apiWebhooks") },
              { href: "/beta",               label: t("apiBetaAccess") },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[11px] text-[var(--text-muted)] hover:text-white transition-colors font-mono"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="p-8">
          <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-5 font-mono">{t("contact")}</p>
          <div className="flex flex-col gap-3 mb-6">
            <a
              href="mailto:contact@bjhunt.com"
              className="text-[11px] text-[var(--text-muted)] hover:text-white transition-colors font-mono"
            >
              contact@bjhunt.com
            </a>
            <a
              href="mailto:partner@bjhunt.com"
              className="text-[11px] text-[var(--text-muted)] hover:text-white transition-colors font-mono"
            >
              partner@bjhunt.com
            </a>
          </div>
          <a
            href="mailto:contact@bjhunt.com"
            className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-white/90 transition-colors"
          >
            {t("writeUs")}
          </a>
        </div>

        {/* Legal / Légal */}
        <div className="p-8">
          <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em] mb-5 font-mono">{t("legal")}</p>
          <div className="flex flex-col gap-3">
            {[
              { href: "/legal", label: t("termsOfUse") },
              { href: "/legal", label: t("privacy") },
              { href: "/legal", label: t("gdpr") },
              { href: "/legal", label: t("legalNotice") },
            ].map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="text-[11px] text-[var(--text-muted)] hover:text-white transition-colors font-mono"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── COPYRIGHT BAR ───────────────────────────────── */}
      <div className="px-8 lg:px-14 py-4 flex items-center gap-6 text-[9px] font-mono text-[var(--text-subtle)]">
        <span>© {year} BJHUNT — {t("copyright")}</span>
        <div className="flex-1" />
        <span className="hidden sm:block">{t("period")}</span>
        <div className="flex items-center gap-2">
          <div className="status-dot" />
          <span className="uppercase tracking-widest text-[var(--success)]">{t("active")}</span>
        </div>
      </div>

    </footer>
  );
}
