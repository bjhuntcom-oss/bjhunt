"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { LogoSymbol, LogoWordmark } from "@/components/ui/logo";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/",          labelKey: "home" },
  { href: "/pricing",   labelKey: "pricing" },
  { href: "/api-docs",  labelKey: "api" },
  { href: "/investors", labelKey: "investors" },
  { href: "/contact",   labelKey: "contact" },
] as const;

export function Header() {
  const [scrolled, setScrolled]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300 ${
        scrolled
          ? "bg-[var(--bg)] border-[var(--border)]"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="flex items-center h-14 px-6 gap-8">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-2.5">
          <LogoSymbol size={22} />
          <LogoWordmark />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] font-medium transition-colors ${
                isActive(link.href)
                  ? "text-white"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <Button asChild size="sm">
            <Link href="/dashboard">Dashboard →</Link>
          </Button>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <div className="w-5 flex flex-col gap-1.5">
              <span className={`block h-px bg-white transition-all ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block h-px bg-white transition-all ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`block h-px bg-white transition-all ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[var(--bg)] border-t border-[var(--border)]">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-6 py-3 text-[10px] uppercase tracking-[0.15em] border-b border-[var(--border)] transition-colors ${
                isActive(link.href)
                  ? "text-white"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
            >
              {t(link.labelKey)}
            </Link>
          ))}
          <div className="px-6 py-3">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
