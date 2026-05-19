"use client";

import { useState, useEffect, useCallback } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { LogoSymbol, LogoWordmark } from "@/components/ui/logo";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const NAV_LINKS = [
  { href: "/",            labelKey: "home" },
  { href: "/technology",  labelKey: "technology" },
  { href: "/pricing",     labelKey: "pricing" },
  { href: "/about",       labelKey: "about" },
  { href: "/contact",     labelKey: "contact" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = useCallback(
    (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href)),
    [pathname],
  );

  const linkClass = (href: string) =>
    `px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.15em] transition-colors ${
      isActive(href) ? "text-bjhunt-brand" : "text-bjhunt-text-secondary hover:text-bjhunt-text"
    }`;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300"
      style={{
        background: scrolled ? "rgba(8,9,13,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        borderColor: scrolled ? "var(--bjhunt-border)" : "transparent",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-6 px-6 md:px-8 lg:px-12">
        <Link href="/" className="flex flex-shrink-0 items-center gap-2.5">
          <LogoSymbol size={22} />
          <LogoWordmark />
        </Link>

        <nav className="hidden md:flex flex-1 items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <a
            href="https://app.bjhunt.com/login"
            className="hidden md:inline-block px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors"
          >
            {t("signIn")}
          </a>
          <Link
            href="/beta"
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-[11px] font-mono font-semibold uppercase tracking-[0.12em] transition-all duration-200"
            style={{
              background: "var(--bjhunt-brand)",
              color: "var(--bjhunt-text-inverted)",
            }}
          >
            {t("joinBeta")} →
          </Link>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <div className="flex w-5 flex-col gap-1.5">
              <span className={`block h-px bg-bjhunt-text transition-all ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block h-px bg-bjhunt-text transition-all ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`block h-px bg-bjhunt-text transition-all ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden" style={{ background: "rgba(8,9,13,0.96)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--bjhunt-border)" }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-6 py-3 text-[11px] font-mono font-semibold uppercase tracking-[0.15em] border-b transition-colors ${
                isActive(link.href) ? "text-bjhunt-brand" : "text-bjhunt-text-secondary hover:text-bjhunt-text"
              }`}
              style={{ borderColor: "var(--bjhunt-border)" }}
            >
              {t(link.labelKey)}
            </Link>
          ))}
          <a
            href="https://app.bjhunt.com/login"
            className="block px-6 py-3 text-[11px] font-mono font-semibold uppercase tracking-[0.15em] text-bjhunt-text-secondary hover:text-bjhunt-text transition-colors"
            style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
          >
            {t("signIn")}
          </a>
          <div className="px-6 py-3">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
