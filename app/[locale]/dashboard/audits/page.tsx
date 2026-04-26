import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { AuditsClient } from './audits-client'
import { Eyebrow, H1, Body } from '@/components/ui/typography'

export default async function AuditsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const meRes = await serverBackendFetch('/api/auth/me', {}, cookieHeader)
  if (!meRes.ok) redirect(`/${locale}/login`)

  const engRes = await serverBackendFetch('/api/engagements?limit=20', {}, cookieHeader)
  const engData = engRes.ok ? await engRes.json() : { engagements: [] }
  const data = { runs: engData.engagements ?? [], total: (engData.engagements ?? []).length }

  return (
    <div className="px-4 py-8 sm:px-6 md:p-10 max-w-[1280px] mx-auto">
      <header className="mb-10 md:mb-12">
        <Eyebrow className="mb-4 inline-block">02 / Engagements</Eyebrow>
        <H1>Audits</H1>
        <Body muted className="mt-4 max-w-2xl">
          History and lifecycle of every security engagement — from intake
          through orchestrator hand-off to verified findings.
        </Body>
      </header>
      <AuditsClient initialRuns={data.runs} initialTotal={data.total} locale={locale} />
    </div>
  )
}
