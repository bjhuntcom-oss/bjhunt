import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { AgentsClient } from './agents-client'
import { AdminHero } from '../_components/admin-primitives'

export default async function AdminAgentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const res = await serverBackendFetch('/api/admin/agents', {}, cookieHeader)
  const agentData = res.ok ? await res.json() : { profiles: [] }
  const data = { profiles: agentData.profiles ?? [] }

  return (
    <div className="p-6 md:p-10 max-w-[1280px] mx-auto">
      <AdminHero
        eyebrow="ADMIN / AGENTS"
        title="Agent Profiles"
        description="Profils SOUL.md / AGENTS.md déployés dans le workspace gateway. Un seul profil actif à la fois — l'activation propage en ~1s."
      />
      <AgentsClient initialProfiles={data.profiles} />
    </div>
  )
}
