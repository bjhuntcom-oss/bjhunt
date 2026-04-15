import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { GatewayProvidersClient } from './providers-client'
import { OllamaModels } from './ollama-models'

export default async function AdminGatewayPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const [gatewayRes, ollamaRes] = await Promise.all([
    serverBackendFetch('/api/admin/gateway/config', {}, cookieHeader),
    serverBackendFetch('/api/admin/ollama/models', {}, cookieHeader),
  ])

  const config = gatewayRes.ok
    ? await gatewayRes.json()
    : { providers: {}, defaults: { model: '' }, ui: { assistant: { name: 'BJHUNT', avatar: 'B' } } }
  const ollamaData = ollamaRes.ok ? await ollamaRes.json() : { models: [] }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Gateway & Providers</h1>
        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
          Gestion des providers LLM — les changements sont appliqués en ~1s
        </p>
      </div>
      <GatewayProvidersClient initialConfig={config} locale={locale} />
      <OllamaModels initialModels={ollamaData.models} />
    </div>
  )
}
