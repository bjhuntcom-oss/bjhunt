"use client";

import { usePathname } from "@/i18n/routing";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import CookieConsentBanner from "@/components/CookieConsent";

const DOCS_PATHS = ["/api-docs"];

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
  const isDocs = DOCS_PATHS.some((p) => pathname.startsWith(p));

  if (isDocs) {
    return <>{children}</>;
  }

  return (
    <>
      <SkipToMain />
      <AnnouncementBanner />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CookieConsentBanner />
    </>
  );
}
