"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import CookieConsentBanner from "@/components/CookieConsent";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.includes("/dashboard");

  if (isDashboard) {
    return <main className="h-screen">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="pt-14">{children}</main>
      <Footer />
      <CookieConsentBanner />
    </>
  );
}
