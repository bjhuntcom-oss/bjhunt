import Link from 'next/link'
import { ArrowRight, Terminal, Key, Zap, Shield, Globe, Cloud } from 'lucide-react'
import { Eyebrow, H1, H2, H3, Body, Code as CodeText, Caption } from '@/components/ui/typography'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type EndpointDef = {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH'
  path: string
  desc: string
  auth: string
  params?: string
  body?: string
  response?: string
}

type SectionDef = {
  id: string
  title: string
  icon: typeof Key
  endpoints: EndpointDef[]
}

export default async function ApiDocsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isFr = locale === 'fr'

  const sections: SectionDef[] = [
    {
      id: 'auth',
      title: isFr ? 'Authentification' : 'Authentication',
      icon: Key,
      endpoints: [
        {
          method: 'POST',
          path: '/api/v1/scans',
          desc: isFr ? 'Lancer un scan de sécurité' : 'Launch a security scan',
          auth: 'API Key',
          body: `{
  "name": "Audit complet avant mise en production",
  "target": "https://app.example.com",
  "type": "full",
  "config": { "depth": "deep" },
  "webhook": "https://hooks.example.com/bjhunt",
  "tags": ["pre-prod", "critical"]
}`,
          response: `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "agent": "bjhunt",
  "message": "L'orchestrateur BJHUNT lance 17 agents IA...",
  "_links": {
    "self": "/api/v1/scans/550e8400...",
    "findings": "/api/v1/scans/550e8400.../findings",
    "status": "/api/v1/scans/550e8400.../status"
  }
}`,
        },
      ],
    },
    {
      id: 'scans',
      title: isFr ? 'Scans & Audits' : 'Scans & Audits',
      icon: Shield,
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/scans',
          desc: isFr ? 'Lister tous vos scans' : 'List all your scans',
          auth: 'API Key',
          params: '?limit=20&offset=0&status=running',
        },
        {
          method: 'GET',
          path: '/api/v1/scans/:id',
          desc: isFr ? "Détail d'un scan" : 'Scan detail',
          auth: 'API Key',
        },
        {
          method: 'GET',
          path: '/api/v1/scans/:id/status',
          desc: isFr
            ? 'Status rapide (pour polling CI/CD)'
            : 'Quick status (for CI/CD polling)',
          auth: 'API Key',
          response: `{
  "status": "completed",
  "findings": { "total": 12, "critical": 2, "high": 4 }
}`,
        },
        {
          method: 'GET',
          path: '/api/v1/scans/:id/findings',
          desc: isFr ? "Findings d'un scan" : 'Scan findings',
          auth: 'API Key',
          params: '?severity=critical',
        },
        {
          method: 'DELETE',
          path: '/api/v1/scans/:id',
          desc: isFr ? 'Annuler ou supprimer un scan' : 'Cancel or delete a scan',
          auth: 'API Key',
        },
      ],
    },
    {
      id: 'agents',
      title: 'Agents',
      icon: Zap,
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/agents',
          desc: isFr ? 'Lister les agents IA disponibles' : 'List available AI agents',
          auth: 'API Key',
          response: `{
  "agents": [
    { "id": "bjhunt", "name": "Orchestrator", "type": "full" },
    { "id": "recon", "name": "Recon", "type": "recon" },
    { "id": "exploit", "name": "Exploit", "type": "web" },
    { "id": "cloud_hunter", "name": "Cloud Hunter", "type": "cloud" }
  ]
}`,
        },
      ],
    },
    {
      id: 'health',
      title: 'Health',
      icon: Globe,
      endpoints: [
        {
          method: 'GET',
          path: '/api/health/live',
          desc: isFr ? 'Liveness — service démarré' : 'Liveness — service running',
          auth: 'None',
        },
        {
          method: 'GET',
          path: '/api/health/ready',
          desc: isFr
            ? 'Readiness — tous les services connectés'
            : 'Readiness — all services connected',
          auth: 'None',
        },
        {
          method: 'GET',
          path: '/api/health/version',
          desc: isFr ? 'Version du backend' : 'Backend version',
          auth: 'None',
        },
      ],
    },
  ]

  const scanTypes = [
    {
      type: 'full',
      label: isFr ? 'Audit complet (tous agents)' : 'Full audit (all agents)',
      agent: 'bjhunt',
    },
    {
      type: 'recon',
      label: isFr ? 'Reconnaissance OSINT + ports' : 'OSINT + port recon',
      agent: 'recon',
    },
    {
      type: 'web',
      label: isFr ? 'Audit web (SQLi, XSS, SSRF...)' : 'Web audit (SQLi, XSS, SSRF...)',
      agent: 'exploit',
    },
    {
      type: 'network',
      label: isFr ? 'Scan réseau interne' : 'Internal network scan',
      agent: 'recon',
    },
    {
      type: 'cloud',
      label: isFr ? 'Audit cloud (AWS, K8s)' : 'Cloud audit (AWS, K8s)',
      agent: 'cloud_hunter',
    },
    {
      type: 'api',
      label: isFr ? 'Analyse de code / API' : 'Code / API analysis',
      agent: 'analyst',
    },
  ]

  return (
    <div className="pt-14 flex min-h-screen bg-[var(--bjhunt-bg)] text-[var(--bjhunt-text)]">
      {/* TOC sidebar (lg+) */}
      <aside
        className="hidden lg:block w-60 border-r sticky top-14 h-[calc(100vh-56px)] overflow-y-auto p-6"
        style={{
          borderColor: 'var(--bjhunt-border)',
          backgroundColor: 'var(--bjhunt-bg)',
        }}
      >
        <Eyebrow>API Reference</Eyebrow>
        <nav className="flex flex-col gap-3 mt-4">
          <a
            href="#quickstart"
            className="font-mono text-[12px] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
          >
            {isFr ? 'Démarrage rapide' : 'Quick Start'}
          </a>
          {sections.map((s) => (
            <div key={s.id} className="flex flex-col gap-1">
              <a
                href={`#${s.id}`}
                className="font-mono text-[12px] font-semibold text-[var(--bjhunt-text)]"
              >
                {s.title}
              </a>
              <div className="flex flex-col gap-1 ml-2">
                {s.endpoints.map((ep) => (
                  <a
                    key={ep.path}
                    href={`#${ep.path.replace(/[/:]/g, '-')}`}
                    className="flex items-center gap-2 text-[11px] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
                  >
                    <span
                      className="font-mono font-semibold text-[10px] w-10"
                      style={{ color: methodVar(ep.method) }}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono truncate">{ep.path}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content (right column) */}
      <main className="flex-1 px-6 md:px-10 py-12 max-w-4xl">
        <Eyebrow>API Reference</Eyebrow>
        <H1 className="mt-3 mb-3">BJHUNT API v1</H1>
        <Body className="text-[var(--bjhunt-text-muted)] leading-[1.6] max-w-2xl">
          {isFr
            ? "Intégrez BJHUNT dans votre CI/CD — lancez des audits de sécurité autonomes, récupérez les findings, et protégez votre infrastructure en continu."
            : 'Integrate BJHUNT into your CI/CD — launch autonomous security audits, retrieve findings, and continuously protect your infrastructure.'}
        </Body>

        <div className="flex items-center gap-3 mt-6 mb-12">
          <Badge variant="success">Enterprise only</Badge>
          <Caption className="text-[var(--bjhunt-text-muted)]">
            {isFr
              ? 'Accès réservé au plan Enterprise ($2,000/mois)'
              : 'Restricted to Enterprise plan ($2,000/mo)'}
          </Caption>
        </div>

        {/* Quick Start */}
        <section id="quickstart" className="mb-16">
          <H2 className="mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[var(--state-success)]" />
            {isFr ? 'Démarrage rapide' : 'Quick Start'}
          </H2>
          <CodeBlock>
            <CodeLine kind="comment">
              # {isFr
                ? '1. Créez une clé API dans Dashboard → Settings → API Keys'
                : '1. Create an API key in Dashboard → Settings → API Keys'}
            </CodeLine>
            <CodeLine kind="comment">
              # {isFr ? '2. Lancez un scan' : '2. Launch a scan'}
            </CodeLine>
            <CodeLine>
              curl -X POST https://api.bjhunt.com/api/v1/scans \
            </CodeLine>
            <CodeLine indent>
              -H {'"'}Authorization: Bearer bjk_your_api_key{'"'} \
            </CodeLine>
            <CodeLine indent>
              -H {'"'}Content-Type: application/json{'"'} \
            </CodeLine>
            <CodeLine indent>-d {"'{"}</CodeLine>
            <CodeLine indent kind="success">
              {'"'}name{'"'}: {'"'}Audite mon app avant la mise en prod{'"'},
            </CodeLine>
            <CodeLine indent kind="success">
              {'"'}target{'"'}: {'"'}https://app.example.com{'"'},
            </CodeLine>
            <CodeLine indent kind="success">
              {'"'}type{'"'}: {'"'}full{'"'}
            </CodeLine>
            <CodeLine>{"}'"}</CodeLine>
            <div
              className="mt-4 pt-4"
              style={{ borderTop: '1px solid var(--bjhunt-border)' }}
            >
              <CodeLine kind="comment">
                # {isFr ? '3. Vérifiez le status' : '3. Check status'}
              </CodeLine>
              <CodeLine>
                curl https://api.bjhunt.com/api/v1/scans/SCAN_ID/status \
              </CodeLine>
              <CodeLine indent>
                -H {'"'}Authorization: Bearer bjk_your_api_key{'"'}
              </CodeLine>
            </div>
            <div
              className="mt-4 pt-4"
              style={{ borderTop: '1px solid var(--bjhunt-border)' }}
            >
              <CodeLine kind="comment">
                # {isFr ? '4. Récupérez les findings' : '4. Retrieve findings'}
              </CodeLine>
              <CodeLine>
                curl https://api.bjhunt.com/api/v1/scans/SCAN_ID/findings \
              </CodeLine>
              <CodeLine indent>
                -H {'"'}Authorization: Bearer bjk_your_api_key{'"'}
              </CodeLine>
            </div>
          </CodeBlock>
        </section>

        {/* Auth */}
        <section id="auth-overview" className="mb-12">
          <H2 className="mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-[var(--state-warning)]" />
            {isFr ? 'Authentification' : 'Authentication'}
          </H2>
          <Body className="text-[var(--bjhunt-text-muted)] leading-[1.6] mb-4">
            {isFr
              ? 'Toutes les requêtes API v1 nécessitent une clé API dans le header Authorization.'
              : 'All API v1 requests require an API key in the Authorization header.'}
          </Body>
          <CodeBlock>
            <span className="text-[var(--bjhunt-text-muted)]">Authorization: </span>
            <span className="text-[var(--bjhunt-text)]">Bearer bjk_your_api_key_here</span>
          </CodeBlock>
          <Caption className="text-[var(--bjhunt-text-muted)] mt-3">
            {isFr
              ? 'Créez vos clés dans Dashboard → Paramètres → Clés API. Les clés sont affichées une seule fois.'
              : 'Create keys in Dashboard → Settings → API Keys. Keys are shown only once.'}
          </Caption>
        </section>

        {/* Scan Types */}
        <section className="mb-12">
          <H2 className="mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[var(--bjhunt-text-muted)]" />
            {isFr ? 'Types de scan' : 'Scan Types'}
          </H2>
          <div className="grid sm:grid-cols-2 gap-3">
            {scanTypes.map((st) => (
              <Card key={st.type} padding="compact" variant="default">
                <CodeText className="text-[var(--state-success)]">
                  {'"'}
                  {st.type}
                  {'"'}
                </CodeText>
                <Caption className="block mt-2 text-[var(--bjhunt-text-secondary)]">
                  {st.label}
                </Caption>
                <Caption className="block mt-1 text-[var(--bjhunt-text-muted)]">
                  Agent: <span className="font-mono">{st.agent}</span>
                </Caption>
              </Card>
            ))}
          </div>
        </section>

        {/* Endpoint sections */}
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="mb-12">
            <H2 className="mb-5 flex items-center gap-2">
              <section.icon className="w-5 h-5 text-[var(--bjhunt-text-muted)]" />
              {section.title}
            </H2>

            <div className="flex flex-col gap-5">
              {section.endpoints.map((ep) => (
                <EndpointCard key={ep.path} ep={ep} />
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="mt-16">
          <Card padding="loose">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-1">
                <H3 className="mb-2">
                  {isFr ? 'Prêt à intégrer ?' : 'Ready to integrate?'}
                </H3>
                <Body className="text-[var(--bjhunt-text-muted)] leading-[1.6] mb-5">
                  {isFr
                    ? "L'API BJHUNT est disponible avec les plans Pro et Enterprise. Générez une clé API dans votre Dashboard et lancez votre premier audit automatisé."
                    : 'The BJHUNT API is available with Pro and Enterprise plans. Generate an API key in your Dashboard and launch your first automated audit.'}
                </Body>
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="state" state="success">
                    <Link href={`/${locale}/pricing`}>
                      {isFr ? 'Voir les plans' : 'View plans'}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={`/${locale}/contact`}>
                      {isFr ? 'Contacter les ventes' : 'Contact sales'}
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="hidden md:block text-right min-w-[180px]">
                <Eyebrow className="block mb-3">
                  {isFr ? 'Accès API v1' : 'API v1 Access'}
                </Eyebrow>
                <div className="space-y-1.5 font-mono text-[12px]">
                  <div className="flex justify-between gap-6">
                    <span className="text-[var(--bjhunt-text-muted)]">Free</span>
                    <span className="text-[var(--state-critical)]">
                      {isFr ? 'Aucun accès' : 'No access'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-[var(--state-warning)]">Pro</span>
                    <span className="text-[var(--state-critical)]">
                      {isFr ? "Pas d'accès API" : 'No API access'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-[var(--state-success)]">Enterprise</span>
                    <span className="text-[var(--bjhunt-text)]">
                      20 scans/mo · 17 agents
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  )
}

/* ──────────────── helpers ──────────────── */

function methodVar(method: string): string {
  if (method === 'GET') return 'var(--state-success)'
  if (method === 'POST') return 'var(--state-warning)'
  if (method === 'DELETE') return 'var(--state-critical)'
  return 'var(--bjhunt-text)'
}

function methodBadge(method: string): 'success' | 'warning' | 'critical' | 'default' {
  if (method === 'GET') return 'success'
  if (method === 'POST') return 'warning'
  if (method === 'DELETE') return 'critical'
  return 'default'
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre
      className="font-mono text-[13px] leading-[1.45] p-5 rounded-[var(--bjhunt-radius-md)] overflow-x-auto"
      style={{
        backgroundColor: 'var(--bjhunt-bg-surface)',
        border: '1px solid var(--bjhunt-border)',
        color: 'var(--bjhunt-text)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {children}
    </pre>
  )
}

function CodeLine({
  children,
  kind,
  indent,
}: {
  children: React.ReactNode
  kind?: 'comment' | 'success'
  indent?: boolean
}) {
  const color =
    kind === 'comment'
      ? 'var(--bjhunt-text-muted)'
      : kind === 'success'
      ? 'var(--state-success)'
      : 'var(--bjhunt-text)'
  return (
    <div style={{ color, paddingLeft: indent ? 16 : 0 }}>{children}</div>
  )
}

function EndpointCard({ ep }: { ep: EndpointDef }) {
  return (
    <Card
      padding="compact"
      variant="default"
      id={ep.path.replace(/[/:]/g, '-')}
      className="!p-0 overflow-hidden"
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-5 py-3"
        style={{ borderBottom: '1px solid var(--bjhunt-border)' }}
      >
        <Badge variant={methodBadge(ep.method)}>{ep.method}</Badge>
        <CodeText className="text-[var(--bjhunt-text)]">{ep.path}</CodeText>
        {ep.auth !== 'None' && (
          <span className="ml-auto">
            <Badge variant="warning">{ep.auth}</Badge>
          </span>
        )}
      </div>

      {/* Description */}
      <div className="px-5 py-4">
        <Body className="text-[var(--bjhunt-text-muted)] leading-[1.6]">{ep.desc}</Body>
        {ep.params && (
          <Caption className="block mt-2 font-mono text-[var(--bjhunt-text-muted)]">
            Params: <span className="text-[var(--bjhunt-text)]">{ep.params}</span>
          </Caption>
        )}
      </div>

      {/* Request body */}
      {ep.body && (
        <div
          className="px-5 py-4"
          style={{ borderTop: '1px solid var(--bjhunt-border)' }}
        >
          <Eyebrow className="block mb-2">Request Body</Eyebrow>
          <pre
            className="font-mono text-[12px] leading-[1.5] p-3 rounded-[var(--bjhunt-radius)] overflow-x-auto"
            style={{
              backgroundColor: 'var(--bjhunt-bg)',
              border: '1px solid var(--bjhunt-border)',
              color: 'var(--state-success)',
            }}
          >
            {ep.body}
          </pre>
        </div>
      )}

      {/* Response */}
      {ep.response && (
        <div
          className="px-5 py-4"
          style={{ borderTop: '1px solid var(--bjhunt-border)' }}
        >
          <Eyebrow className="block mb-2">Response</Eyebrow>
          <pre
            className="font-mono text-[12px] leading-[1.5] p-3 rounded-[var(--bjhunt-radius)] overflow-x-auto"
            style={{
              backgroundColor: 'var(--bjhunt-bg)',
              border: '1px solid var(--bjhunt-border)',
              color: 'var(--bjhunt-text-secondary)',
            }}
          >
            {ep.response}
          </pre>
        </div>
      )}
    </Card>
  )
}
