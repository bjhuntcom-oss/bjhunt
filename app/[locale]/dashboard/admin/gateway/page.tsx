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

  const settingsRes = await serverBackendFetch('/api/admin/settings', {}, cookieHeader)
  const settingsData = settingsRes.ok ? await settingsRes.json() : { settings: [] }

  // Build gateway config from platform settings
  const gatewayConfig = settingsData.settings?.find?.((s: any) => s.key === 'gateway_config')
  // Value may be double-encoded JSON string or already parsed object
  const parsedGateway = (() => {
    const v = gatewayConfig?.value
    if (!v) return null
    if (typeof v === 'string') { try { return JSON.parse(v) } catch { return null } }
    return v
  })()
  const config = parsedGateway ?? {
    providers: {
      anthropic: { name: 'Anthropic', enabled: true, models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'] },
      openai: { name: 'OpenAI', enabled: true, models: ['gpt-5.4', 'gpt-4.1'] },
      'ollama-cloud': { name: 'Ollama Cloud', enabled: true, models: ['deepseek-v3.2', 'kimi-k2'] },
    },
    defaults: { model: 'claude-sonnet-4-6' },
    ui: { assistant: { name: 'BJHUNT ALPHA 1.0', avatar: 'B' } },
  }
  const ollamaData = { models: [] }

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
