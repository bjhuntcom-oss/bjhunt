import type { Metadata, Viewport } from "next";
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

// Refonte 2026 design system — Inter for body/UI (400/500/600).
// Display + H1/H2 use system-ui per spec §2 (instant render, OS authority).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050507',
};

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
    // Refonte 2026: SVG-only icon set. PNG apple-touch-icon + og-image are
    // TODO — see public/manifest.webmanifest. Generate with sharp/scripts.
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icon.svg", type: "image/svg+xml", sizes: "32x32" },
      ],
      apple: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
    manifest: "/manifest.webmanifest",
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
