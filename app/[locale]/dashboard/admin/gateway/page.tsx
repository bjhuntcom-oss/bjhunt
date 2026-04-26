import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { GatewayProvidersClient } from './providers-client'
import { OllamaModels } from './ollama-models'
import { AdminHero } from '../_components/admin-primitives'

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

  const gatewayConfig = settingsData.settings?.find?.(
    (s: any) => s.key === 'gateway_config',
  )
  const parsedGateway = (() => {
    const v = gatewayConfig?.value
    if (!v) return null
    if (typeof v === 'string') {
      try {
        return JSON.parse(v)
      } catch {
        return null
      }
    }
    return v
  })()
  const config = parsedGateway ?? {
    providers: {
      anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com',
        apiKey: '',
        enabled: true,
        models: [],
      },
      openai: {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        enabled: true,
        models: [],
      },
      'ollama-cloud': {
        id: 'ollama-cloud',
        name: 'Ollama Cloud',
        baseUrl: 'https://ollama.com/v1',
        apiKey: '',
        enabled: true,
        models: [],
      },
    },
    defaults: { model: 'claude-sonnet-4-6' },
    ui: { assistant: { name: 'BJHUNT ALPHA 1.0', avatar: 'B' } },
  }
  const ollamaData = { models: [] }

  return (
    <div className="p-6 md:p-10 max-w-[1280px] mx-auto">
      <AdminHero
        eyebrow="ADMIN / GATEWAY"
        title="Gateway & Providers"
        description="Configuration des providers LLM et de leurs modèles. Les changements sont appliqués en ~1s. Clés API stockées chiffrées AES-256-GCM."
      />
      <GatewayProvidersClient initialConfig={config} locale={locale} />
      <OllamaModels initialModels={ollamaData.models} />
    </div>
  )
}
