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
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div className="flex items-center gap-1 text-[10px] font-mono">
      <button
        onClick={() => switchLocale('fr')}
        disabled={isPending}
        className={`px-2 py-1 transition-colors ${
          locale === 'fr' 
            ? 'bg-white text-black' 
            : 'text-white/50 hover:text-white hover:bg-white/10'
        }`}
      >
        FR
      </button>
      <button
        onClick={() => switchLocale('en')}
        disabled={isPending}
        className={`px-2 py-1 transition-colors ${
          locale === 'en' 
            ? 'bg-white text-black' 
            : 'text-white/50 hover:text-white hover:bg-white/10'
        }`}
      >
        EN
      </button>
    </div>
  );
}
