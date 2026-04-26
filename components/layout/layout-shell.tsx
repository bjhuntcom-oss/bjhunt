"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import CookieConsentBanner from "@/components/CookieConsent";

/**
 * Skip-to-main link — WCAG 2.4.1 (Bypass Blocks).
 * Hidden until focused via Tab from the very top of the page.
 */
function SkipToMain() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-[var(--bjhunt-bg-surface)] focus:text-[var(--bjhunt-text)] focus:px-4 focus:py-2 focus:font-mono focus:font-semibold focus:text-[12px] focus:uppercase focus:tracking-[0.18em] focus:rounded-[var(--bjhunt-radius)] focus:border focus:border-[var(--state-success)] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--state-success)]"
    >
      Skip to main content
    </a>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.includes("/dashboard");

  if (isDashboard) {
    return (
      <>
        <SkipToMain />
        <main id="main" className="h-screen">{children}</main>
      </>
    );
  }

  return (
    <>
      <SkipToMain />
      <Header />
      <main id="main" className="pt-14">{children}</main>
      <Footer />
      <CookieConsentBanner />
    </>
  );
}
