import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { AgentsClient } from './agents-client'

export default async function AdminAgentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const res = await serverBackendFetch('/api/admin/settings/agents', {}, cookieHeader)
  const agentData = res.ok ? await res.json() : { agents: [] }
  // Map LangGraph assistants to profiles format expected by client
  const data = { profiles: (agentData.agents ?? []).map((a: any) => ({
    id: a.assistant_id || a.graph_id || a.name,
    name: a.name || a.assistant_id,
    description: a.description || '',
    status: 'active',
  })) }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Agent Profiles</h1>
        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
          Gestion des profils SOUL.md / AGENTS.md — activer un profil le déploie dans le workspace gateway
        </p>
      </div>
      <AgentsClient initialProfiles={data.profiles} />
    </div>
  )
}
