import { NextResponse } from 'next/server'

/**
 * Placeholder auth callback route.
 * BJHUNT currently uses the dedicated backend auth flow on /[locale]/login.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  // Detect locale from cookie or default to 'fr'
  const cookieHeader = request.headers.get('cookie') || ''
  const localeMatch = cookieHeader.match(/BJHUNT_LOCALE=([a-z]{2})/)
  const locale = localeMatch?.[1] === 'en' ? 'en' : 'fr'

  return NextResponse.redirect(new URL(`/${locale}/login`, origin))
}
