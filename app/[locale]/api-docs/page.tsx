import Link from 'next/link'
import { ArrowRight, Terminal, Key, Zap, Shield, Globe, Cloud } from 'lucide-react'
import { SectionLabel } from '@/components/ui/section-label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function ApiDocsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isFr = locale === 'fr'

  const sections = [
    {
      id: "auth",
      title: isFr ? "Authentification" : "Authentication",
      icon: Key,
      endpoints: [
        {
          method: "POST", path: "/api/v1/scans",
          desc: isFr ? "Lancer un scan de sécurité" : "Launch a security scan",
          auth: "API Key",
          body: `{
  "name": "Production Audit Q2",
  "target": "https://app.example.com",
  "type": "full",
  "config": {
    "depth": "standard"
  },
  "webhook": "https://hooks.example.com/bjhunt",
  "tags": ["production", "quarterly"]
}`,
          response: `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "agent": "bjhunt",
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
      id: "scans",
      title: isFr ? "Scans & Audits" : "Scans & Audits",
      icon: Shield,
      endpoints: [
        {
          method: "GET", path: "/api/v1/scans",
          desc: isFr ? "Lister tous vos scans" : "List all your scans",
          auth: "API Key",
          params: "?limit=20&offset=0&status=running",
        },
        {
          method: "GET", path: "/api/v1/scans/:id",
          desc: isFr ? "Détail d'un scan" : "Scan detail",
          auth: "API Key",
        },
        {
          method: "GET", path: "/api/v1/scans/:id/status",
          desc: isFr ? "Status rapide (pour polling CI/CD)" : "Quick status (for CI/CD polling)",
          auth: "API Key",
          response: `{
  "status": "completed",
  "findings": { "total": 12, "critical": 2, "high": 4 }
}`,
        },
        {
          method: "GET", path: "/api/v1/scans/:id/findings",
          desc: isFr ? "Findings d'un scan" : "Scan findings",
          auth: "API Key",
          params: "?severity=critical",
        },
        {
          method: "DELETE", path: "/api/v1/scans/:id",
          desc: isFr ? "Annuler ou supprimer un scan" : "Cancel or delete a scan",
          auth: "API Key",
        },
      ],
    },
    {
      id: "agents",
      title: "Agents",
      icon: Zap,
      endpoints: [
        {
          method: "GET", path: "/api/v1/agents",
          desc: isFr ? "Lister les agents IA disponibles" : "List available AI agents",
          auth: "API Key",
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
      id: "health",
      title: "Health",
      icon: Globe,
      endpoints: [
        { method: "GET", path: "/api/health/live", desc: isFr ? "Liveness — service démarré" : "Liveness — service running", auth: "None" },
        { method: "GET", path: "/api/health/ready", desc: isFr ? "Readiness — tous les services connectés" : "Readiness — all services connected", auth: "None" },
        { method: "GET", path: "/api/health/version", desc: isFr ? "Version du backend" : "Backend version", auth: "None" },
      ],
    },
  ]

  const scanTypes = [
    { type: "full", label: isFr ? "Audit complet (tous agents)" : "Full audit (all agents)", agent: "bjhunt" },
    { type: "recon", label: isFr ? "Reconnaissance OSINT + ports" : "OSINT + port recon", agent: "recon" },
    { type: "web", label: isFr ? "Audit web (SQLi, XSS, SSRF...)" : "Web audit (SQLi, XSS, SSRF...)", agent: "exploit" },
    { type: "network", label: isFr ? "Scan réseau interne" : "Internal network scan", agent: "recon" },
    { type: "cloud", label: isFr ? "Audit cloud (AWS, K8s)" : "Cloud audit (AWS, K8s)", agent: "cloud_hunter" },
    { type: "api", label: isFr ? "Analyse de code / API" : "Code / API analysis", agent: "analyst" },
  ]

  const methodColor = (m: string) =>
    m === "GET" ? "success" : m === "POST" ? "warning" : m === "DELETE" ? "danger" : "default"

  return (
    <div className="pt-14 flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:block w-56 border-r border-[var(--border)] bg-[var(--bg)] sticky top-14 h-[calc(100vh-56px)] overflow-y-auto p-6">
        <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">API Reference</p>
        <nav className="flex flex-col gap-3">
          <a href="#quickstart" className="text-[10px] text-[var(--text-muted)] hover:text-white transition-colors font-mono">
            {isFr ? "Démarrage rapide" : "Quick Start"}
          </a>
          {sections.map((s) => (
            <div key={s.id}>
              <a href={`#${s.id}`} className="text-[10px] text-white font-mono font-bold">{s.title}</a>
              <div className="flex flex-col gap-0.5 mt-1 ml-2">
                {s.endpoints.map((ep) => (
                  <a key={ep.path} href={`#${ep.path.replace(/[/:]/g, '-')}`}
                    className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)] hover:text-white transition-colors">
                    <span className={`w-6 text-[7px] font-bold ${ep.method === 'GET' ? 'text-[var(--success)]' : ep.method === 'POST' ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`}>
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

      <main className="flex-1 px-8 py-10 max-w-4xl">
        <SectionLabel>API Reference</SectionLabel>
        <h1 className="text-3xl font-black mt-3 mb-2 tracking-tight">BJHUNT API v1</h1>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {isFr
            ? "Intégrez BJHUNT dans votre CI/CD — lancez des audits de sécurité autonomes, récupérez les findings, et protégez votre infrastructure en continu."
            : "Integrate BJHUNT into your CI/CD — launch autonomous security audits, retrieve findings, and continuously protect your infrastructure."}
        </p>
        <div className="flex items-center gap-3 mb-8 text-[9px] uppercase tracking-wider">
          <span className="px-2 py-1 bg-[var(--warning-dim)] text-[var(--warning)]">Pro</span>
          <span className="px-2 py-1 bg-[var(--success-dim)] text-[var(--success)]">Enterprise</span>
          <span className="text-[var(--text-subtle)]">{isFr ? "Disponible avec les plans Pro et Enterprise" : "Available with Pro and Enterprise plans"}</span>
        </div>

        {/* Quick Start */}
        <div id="quickstart" className="mb-12">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--success)]" />
            {isFr ? "Démarrage rapide" : "Quick Start"}
          </h2>
          <div className="border border-[var(--border)] bg-[#0d0d0d] p-5 font-mono text-[11px] space-y-3">
            <p className="text-[var(--text-muted)]"># {isFr ? "1. Créez une clé API dans Dashboard → Settings → API Keys" : "1. Create an API key in Dashboard → Settings → API Keys"}</p>
            <p className="text-[var(--text-muted)]"># {isFr ? "2. Lancez un scan" : "2. Launch a scan"}</p>
            <p className="text-white">
              curl -X POST https://api.bjhunt.com/api/v1/scans \{'\n'}
              {'  '}-H {'"'}Authorization: Bearer bjk_your_api_key{'"'} \{'\n'}
              {'  '}-H {'"'}Content-Type: application/json{'"'} \{'\n'}
              {'  '}-d {"'{"}
            </p>
            <p className="text-[var(--success)] pl-4">
              {'"'}name{'"'}: {'"'}CI Audit{'"'},{'\n'}
              {'    '}{'"'}target{'"'}: {'"'}https://app.example.com{'"'},{'\n'}
              {'    '}{'"'}type{'"'}: {'"'}full{'"'}
            </p>
            <p className="text-white">{"  }'}"}</p>
            <div className="border-t border-[var(--border)] pt-3 mt-3">
              <p className="text-[var(--text-muted)]"># {isFr ? "3. Vérifiez le status" : "3. Check status"}</p>
              <p className="text-white">
                curl https://api.bjhunt.com/api/v1/scans/SCAN_ID/status \{'\n'}
                {'  '}-H {'"'}Authorization: Bearer bjk_your_api_key{'"'}
              </p>
            </div>
            <div className="border-t border-[var(--border)] pt-3 mt-3">
              <p className="text-[var(--text-muted)]"># {isFr ? "4. Récupérez les findings" : "4. Retrieve findings"}</p>
              <p className="text-white">
                curl https://api.bjhunt.com/api/v1/scans/SCAN_ID/findings \{'\n'}
                {'  '}-H {'"'}Authorization: Bearer bjk_your_api_key{'"'}
              </p>
            </div>
          </div>
        </div>

        {/* Auth section */}
        <div id="auth" className="mb-10">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-[var(--warning)]" />
            {isFr ? "Authentification" : "Authentication"}
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mb-4">
            {isFr
              ? "Toutes les requêtes API v1 nécessitent une clé API dans le header Authorization."
              : "All API v1 requests require an API key in the Authorization header."}
          </p>
          <div className="border border-[var(--border)] bg-[#0d0d0d] p-4 font-mono text-[11px]">
            <span className="text-[var(--text-muted)]">Authorization: </span>
            <span className="text-white">Bearer bjk_your_api_key_here</span>
          </div>
          <p className="text-[9px] text-[var(--text-muted)] mt-2">
            {isFr
              ? "Créez vos clés dans Dashboard → Paramètres → Clés API. Les clés sont affichées une seule fois."
              : "Create keys in Dashboard → Settings → API Keys. Keys are shown only once."}
          </p>
        </div>

        {/* Scan Types */}
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#4488ff]" />
            {isFr ? "Types de scan" : "Scan Types"}
          </h2>
          <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
            {scanTypes.map((st) => (
              <div key={st.type} className="bg-[var(--bg-card)] p-4">
                <code className="text-[11px] text-[var(--success)] font-mono">{'"'}{st.type}{'"'}</code>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{st.label}</p>
                <p className="text-[8px] text-[var(--text-subtle)] mt-0.5">Agent: {st.agent}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Endpoint sections */}
        {sections.map((section) => (
          <div key={section.id} id={section.id} className="mb-10">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <section.icon className="w-4 h-4 text-[var(--text-muted)]" />
              {section.title}
            </h2>

            <div className="flex flex-col gap-5">
              {section.endpoints.map((ep) => (
                <div
                  key={ep.path}
                  id={ep.path.replace(/[/:]/g, '-')}
                  className="border border-[var(--border)] bg-[var(--bg-card)]"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)]">
                    <Badge variant={methodColor(ep.method) as any}>{ep.method}</Badge>
                    <code className="text-[12px] font-mono text-white">{ep.path}</code>
                    {ep.auth !== "None" && (
                      <span className="ml-auto text-[8px] uppercase tracking-wider text-[var(--warning)] bg-[var(--warning-dim)] px-2 py-0.5">
                        {ep.auth}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <div className="px-5 py-3">
                    <p className="text-[11px] text-[var(--text-muted)]">{ep.desc}</p>
                    {'params' in ep && ep.params && (
                      <p className="text-[10px] font-mono text-[var(--text-subtle)] mt-1">
                        Params: <span className="text-[var(--text-muted)]">{ep.params}</span>
                      </p>
                    )}
                  </div>

                  {/* Request body */}
                  {'body' in ep && ep.body && (
                    <div className="border-t border-[var(--border)] px-5 py-3">
                      <p className="text-[8px] uppercase tracking-widest text-[var(--text-subtle)] mb-2">Request Body</p>
                      <pre className="text-[10px] font-mono text-[var(--success)] bg-[#0d0d0d] p-3 overflow-x-auto">{ep.body}</pre>
                    </div>
                  )}

                  {/* Response */}
                  {'response' in ep && ep.response && (
                    <div className="border-t border-[var(--border)] px-5 py-3">
                      <p className="text-[8px] uppercase tracking-widest text-[var(--text-subtle)] mb-2">Response</p>
                      <pre className="text-[10px] font-mono text-[var(--text-muted)] bg-[#0d0d0d] p-3 overflow-x-auto">{ep.response}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* CTA */}
        <div className="mt-8 border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-bold mb-1">{isFr ? "Prêt à intégrer ?" : "Ready to integrate?"}</h3>
              <p className="text-[11px] text-[var(--text-muted)] mb-4">
                {isFr
                  ? "L'API BJHUNT est disponible avec les plans Pro et Enterprise. Générez une clé API dans votre Dashboard et lancez votre premier audit automatisé."
                  : "The BJHUNT API is available with Pro and Enterprise plans. Generate an API key in your Dashboard and launch your first automated audit."}
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href={`/${locale}/pricing`}>
                    {isFr ? 'Voir les plans' : 'View plans'}
                    <ArrowRight className="h-3.5 w-3.5 ml-2" />
                  </Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href={`/${locale}/contact`}>
                    {isFr ? "Contacter les ventes" : 'Contact sales'}
                  </Link>
                </Button>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-[9px] uppercase tracking-wider text-[var(--text-subtle)] mb-2">{isFr ? "Limites par plan" : "Plan limits"}</div>
              <div className="space-y-1 text-[10px] font-mono">
                <div className="flex justify-between gap-6"><span className="text-[var(--text-muted)]">Free</span><span className="text-[var(--danger)]">{isFr ? "Pas d'accès API" : "No API access"}</span></div>
                <div className="flex justify-between gap-6"><span className="text-[var(--warning)]">Pro</span><span className="text-white">50 scans/mois · 5 agents</span></div>
                <div className="flex justify-between gap-6"><span className="text-[var(--success)]">Enterprise</span><span className="text-white">{isFr ? "Illimité · 17 agents" : "Unlimited · 17 agents"}</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
