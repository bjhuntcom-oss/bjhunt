import { NextResponse } from 'next/server'
import { serverBackendFetch } from '@/lib/backend-client'

export const dynamic = 'force-dynamic'

function detectLocale(cookieHeader: string) {
  const localeMatch = cookieHeader.match(/BJHUNT_LOCALE=([a-z]{2})/)
  return localeMatch?.[1] === 'en' ? 'en' : 'fr'
}

function buildRoleMetadata(role: string, locale: 'fr' | 'en') {
  const isFr = locale === 'fr'

  if (role === 'platform_admin') {
    return {
      label: isFr ? 'Admin plateforme' : 'Platform admin',
      workspaceLabel: isFr ? 'Commande BJHUNT' : 'BJHUNT Command',
      summary: isFr
        ? 'Pilotage des defaults plateforme, supervision activite et validation de la lane provider geree.'
        : 'Platform defaults, activity oversight, and managed provider validation for BJHUNT.',
      adminSurface: true,
    }
  }

  if (role === 'org_admin') {
    return {
      label: isFr ? 'Admin organisation' : 'Organization admin',
      workspaceLabel: isFr ? 'Commande organisation' : 'Organization command',
      summary: isFr
        ? 'Pilotage securite, suivi des audits et revue des preuves dans le perimetre de votre organisation.'
        : 'Security oversight, audit review, and evidence tracking inside your organization boundary.',
      adminSurface: false,
    }
  }

  return {
    label: isFr ? 'Analyste' : 'Analyst',
    workspaceLabel: isFr ? 'Workspace BJHUNT' : 'BJHUNT Workspace',
    summary: isFr
      ? 'Workspace dedie, isole et preconfigure par BJHUNT pour vos audits.'
      : 'Dedicated isolated workspace preconfigured by BJHUNT for your audits.',
    adminSurface: false,
  }
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const locale = detectLocale(cookieHeader)

  if (!cookieHeader) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const meResponse = await serverBackendFetch('/api/auth/me', {}, cookieHeader)
  if (!meResponse.ok) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const payload = (await meResponse.json()) as {
    user: {
      displayName: string
      email: string
      role: string
    }
    organization: {
      id: string
      slug: string
      name: string
    }
  }

  return NextResponse.json(
    {
      locale,
      user: payload.user,
      organization: payload.organization,
      role: buildRoleMetadata(payload.user.role, locale),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
