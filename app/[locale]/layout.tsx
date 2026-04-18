import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import "../globals.css";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import { LayoutShell } from "@/components/layout/layout-shell";
import { Preloader } from "@/components/ui/preloader";
import { Inter } from "next/font/google";

// Cut to 3 weights only — we use 400 (body), 600 (UI emphasis), 800 (display
// headings). The previous 7-weight load shipped ~7 woff2 files render-blocking
// LCP. Keeping `display: swap` so first paint is never blocked by the network.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "600", "800"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'globalMeta' })
  
  return {
    metadataBase: new URL("https://www.bjhunt.com"),
    verification: {
      google: "-SQV-2j7dZdQx7H0PWb4ou0B8pnUaVYQ-6iXvphf_nQ",
    },
    title: {
      default: t('title'),
      template: "%s | BJHUNT",
    },
    description: t('description'),
    keywords: locale === 'en'
      ? ["cybersecurity", "vulnerability scanner", "AI security", "BJHUNT", "pentest"]
      : ["cybersécurité", "scanner de vulnérabilités", "sécurité IA", "BJHUNT", "pentest"],
    authors: [{ name: "BJHUNT Team" }],
    creator: "BJHUNT",
    publisher: "BJHUNT",
    robots: { index: true, follow: true },
    alternates: { canonical: `https://www.bjhunt.com/${locale}` },
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: `https://www.bjhunt.com/${locale}`,
      siteName: "BJHUNT",
      type: "website",
      locale: locale === 'en' ? "en_US" : "fr_FR",
      images: [{ url: "/icon.svg", width: 32, height: 32 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t('ogTitle'),
      description: t('ogDescription'),
      images: ["/icon.svg"],
    },
  }
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  if (!routing.locales.includes(locale as 'fr' | 'en')) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  // Read CSP nonce from middleware
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: `{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "BJHUNT Security Platform",
          "applicationCategory": "SecurityApplication"
        }` }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Preloader />
        <NextIntlClientProvider messages={messages}>
          <Suspense fallback={null}>
            <AnalyticsProvider>
              <LayoutShell>{children}</LayoutShell>
            </AnalyticsProvider>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
