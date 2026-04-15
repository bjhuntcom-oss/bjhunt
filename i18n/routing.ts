import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'always', // Always show locale prefix for clarity
  
  // Automatic locale detection based on Accept-Language header
  // Users with non-French browsers will be redirected to /en
  localeDetection: true,
  
  // Remember user's locale preference for 1 year
  localeCookie: {
    name: 'BJHUNT_LOCALE',
    maxAge: 60 * 60 * 24 * 365 // 1 year
  }
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
