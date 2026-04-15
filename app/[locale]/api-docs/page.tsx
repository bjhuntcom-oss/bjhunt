import Link from 'next/link'
import { ArrowRight, ServerCog } from 'lucide-react'
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

  const endpoints = [
    { method: 'GET', path: '/api/health/live' },
    { method: 'GET', path: '/api/health/ready' },
    { method: 'POST', path: '/api/auth/register' },
    { method: 'POST', path: '/api/auth/login' },
    { method: 'GET', path: '/api/auth/me' },
  ]

  const methodVariant = (method: string) => {
    if (method === 'GET') return 'success'
    if (method === 'POST') return 'warning'
    if (method === 'DELETE') return 'danger'
    return 'default'
  }

  return (
    <div className="pt-14 flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:block w-56 border-r border-[var(--border)] bg-[var(--bg)] sticky top-14 h-[calc(100vh-56px)] overflow-y-auto p-6">
        <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Endpoints</p>
        <nav className="flex flex-col gap-1">
          {endpoints.map((ep) => (
            <a
              key={ep.path}
              href={`#${ep.path.replace(/\//g, '-')}`}
              className="flex items-center gap-2 py-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              <Badge variant={methodVariant(ep.method) as any}>{ep.method}</Badge>
              <span className="font-mono truncate">{ep.path}</span>
            </a>
          ))}
        </nav>
      </aside>

      <main className="flex-1 px-8 py-12 max-w-3xl">
        <SectionLabel>Référence API</SectionLabel>
        <h1 className="text-4xl font-black mt-4 mb-4 tracking-tight">API REST v1</h1>
        <p className="text-sm text-[var(--text-muted)] mb-12">
          {isFr
            ? "Le cœur auth, session et santé est déjà actif sur l'infrastructure BJHUNT. La documentation complète des futures API reviendra par phases."
            : 'The auth, session, and health core is already live on BJHUNT infrastructure. Full documentation for upcoming APIs will return in phases.'}
        </p>

        <div className="flex flex-col gap-8">
          {endpoints.map((ep) => (
            <div
              key={ep.path}
              id={ep.path.replace(/\//g, '-')}
              className="border border-[var(--border)] bg-[var(--bg-card)] p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <Badge variant={methodVariant(ep.method) as any}>{ep.method}</Badge>
                <code className="text-sm font-mono text-[var(--text)]">{ep.path}</code>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                {ep.path.includes('health/live') && (isFr ? 'Vérifie que le service est démarré.' : 'Checks the service is running.')}
                {ep.path.includes('health/ready') && (isFr ? 'Vérifie que le service est prêt à recevoir des requêtes.' : 'Checks the service is ready to accept requests.')}
                {ep.path.includes('auth/register') && (isFr ? 'Crée un nouveau compte utilisateur.' : 'Creates a new user account.')}
                {ep.path.includes('auth/login') && (isFr ? 'Authentifie un utilisateur et ouvre une session.' : 'Authenticates a user and opens a session.')}
                {ep.path.includes('auth/me') && (isFr ? 'Retourne le profil de l\'utilisateur authentifié.' : 'Returns the authenticated user profile.')}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {isFr
              ? "Les endpoints publics de scan, findings, reporting et webhooks ne sont pas encore documentés publiquement."
              : 'Public scan, findings, reporting, and webhook endpoints are not publicly documented yet.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/${locale}/login`}>
                {isFr ? 'Tester la connexion' : 'Test sign in'}
                <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/${locale}/contact`}>
                {isFr ? "Contacter l'équipe" : 'Contact the team'}
                <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
