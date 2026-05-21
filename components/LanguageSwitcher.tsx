"use client";

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useTransition } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: 'fr' | 'en') => {
    if (newLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", fontFamily: "var(--bjhunt-font-mono)", fontSize: "10px" }}>
      <button
        onClick={() => switchLocale('fr')}
        disabled={isPending || locale === 'fr'}
        style={{
          padding: "4px 8px",
          border: "1px solid var(--bjhunt-border)",
          borderRadius: 0,
          background: locale === 'fr' ? "var(--bjhunt-text)" : "transparent",
          color: locale === 'fr' ? "var(--bjhunt-bg)" : "var(--bjhunt-text-muted)",
          cursor: locale === 'fr' ? "default" : "pointer",
          fontFamily: "var(--bjhunt-font-mono)",
          fontSize: "10px",
          fontWeight: locale === 'fr' ? 700 : 400,
          transition: "all 0.15s",
        }}
      >
        FR
      </button>
      <button
        onClick={() => switchLocale('en')}
        disabled={isPending || locale === 'en'}
        style={{
          padding: "4px 8px",
          border: "1px solid var(--bjhunt-border)",
          borderRadius: 0,
          background: locale === 'en' ? "var(--bjhunt-text)" : "transparent",
          color: locale === 'en' ? "var(--bjhunt-bg)" : "var(--bjhunt-text-muted)",
          cursor: locale === 'en' ? "default" : "pointer",
          fontFamily: "var(--bjhunt-font-mono)",
          fontSize: "10px",
          fontWeight: locale === 'en' ? 700 : 400,
          transition: "all 0.15s",
        }}
      >
        EN
      </button>
    </div>
  );
}
