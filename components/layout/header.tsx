"use client";

import { useState, useCallback, useEffect } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { LogoSymbol } from "@/components/ui/logo";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const NAV_LINKS = [
  { href: "/", labelKey: "home" },
  { href: "/technology", labelKey: "technology" },
  { href: "/pricing", labelKey: "pricing" },
  { href: "/about", labelKey: "about" },
  { href: "/contact", labelKey: "contact" },
] as const;

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        borderRadius: 0,
        border: "none",
        backgroundColor: "transparent",
        color: "var(--bjhunt-text)",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");

  const isActive = useCallback(
    (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href)),
    [pathname],
  );

  return (
    <header
      className="w-full"
      style={{
        backgroundColor: "var(--bjhunt-bg)",
        borderBottom: "1px solid var(--bjhunt-border)",
      }}
    >
      <div
        className="mx-auto px-6"
        style={{
          maxWidth: "75rem",
          display: "flex",
          alignItems: "center",
          height: "56px",
          position: "relative",
        }}
      >
        {/* Left: Nav links */}
        <nav className="hidden md:flex items-center gap-6" style={{ flex: 1 }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="uppercase"
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: "12px",
                fontWeight: 400,
                letterSpacing: "0.05em",
                color: isActive(link.href) ? "var(--bjhunt-text)" : "var(--bjhunt-text-secondary)",
                textDecoration: isActive(link.href) ? "underline" : "none",
              }}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        {/* Center: Logo — absolutely positioned on center of container */}
        <Link
          href="/"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <LogoSymbol size={24} />
        </Link>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center" style={{ gap: "0.75rem" }}>
          <ThemeToggle />

          <LanguageSwitcher />

          <div style={{ width: "1px", height: "20px", background: "var(--bjhunt-border)" }} />

          <a
            href="https://app.bjhunt.com/login"
            className="uppercase"
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: "12px",
              fontWeight: 400,
              letterSpacing: "0.05em",
              color: "var(--bjhunt-text-secondary)",
              textDecoration: "none",
            }}
          >
            {t("signIn")}
          </a>

          <Link
            href="/beta"
            className="uppercase"
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "0.05em",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--bjhunt-text)",
              color: "var(--bjhunt-bg)",
              height: "32px",
              padding: "0 14px",
              textDecoration: "none",
              borderRadius: 0,
            }}
          >
            {t("joinBeta")}
          </Link>

          <div style={{ width: "1px", height: "20px", background: "var(--bjhunt-border)" }} />

          <a href="https://github.com/bjhunt" target="_blank" rel="noopener noreferrer" style={{ color: "var(--bjhunt-text-secondary)", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
          </a>
          <a href="https://x.com/bjhunt" target="_blank" rel="noopener noreferrer" style={{ color: "var(--bjhunt-text-secondary)", display: "flex", alignItems: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
          <a href="https://linkedin.com/company/bjhunt" target="_blank" rel="noopener noreferrer" style={{ color: "var(--bjhunt-text-secondary)", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <div className="flex w-5 flex-col gap-1.5">
            <span
              className="block h-px transition-all"
              style={{
                backgroundColor: "var(--bjhunt-text)",
                transform: mobileOpen ? "rotate(45deg) translateY(6px)" : "none",
              }}
            />
            <span
              className="block h-px transition-all"
              style={{
                backgroundColor: "var(--bjhunt-text)",
                opacity: mobileOpen ? 0 : 1,
              }}
            />
            <span
              className="block h-px transition-all"
              style={{
                backgroundColor: "var(--bjhunt-text)",
                transform: mobileOpen ? "rotate(-45deg) translateY(-6px)" : "none",
              }}
            />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden flex flex-col"
          style={{
            height: "100dvh",
            backgroundColor: "var(--bjhunt-bg)",
            padding: "1.5rem 1.25rem 1.25rem",
            borderTop: "1px solid var(--bjhunt-border)",
          }}
        >
          <nav className="flex flex-col gap-0">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="uppercase"
                style={{
                  fontFamily: "var(--bjhunt-font-mono)",
                  fontSize: "12px",
                  fontWeight: 400,
                  letterSpacing: "0.05em",
                  color: isActive(link.href) ? "var(--bjhunt-text)" : "var(--bjhunt-text-secondary)",
                  textDecoration: isActive(link.href) ? "underline" : "none",
                  paddingTop: "0.5rem",
                  paddingBottom: "0.5rem",
                }}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            <a
              href="https://app.bjhunt.com/login"
              className="uppercase"
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: "12px",
                fontWeight: 400,
                letterSpacing: "0.05em",
                color: "var(--bjhunt-text-secondary)",
              }}
            >
              {t("signIn")}
            </a>

            <ThemeToggle />

            <Link
              href="/beta"
              className="inline-flex items-center justify-center uppercase"
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.05em",
                backgroundColor: "var(--bjhunt-cta-primary)",
                color: "var(--bjhunt-cta-primary-foreground, var(--bjhunt-text-inverted))",
                height: "52px",
                borderRadius: 0,
              }}
            >
              {t("joinBeta")}
            </Link>

            <div className="mt-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}