# 06 — Frontend

> Next.js 15, App Router, React 19, shadcn/ui, next-intl.
> Deploy sur Vercel. Pages marketing SSR, dashboard CSR.

## Stack

| Composant | Technologie |
|---|---|
| Framework | Next.js 15 (App Router) |
| React | React 19 |
| UI | shadcn/ui + Radix primitives |
| Styling | Tailwind CSS v4 |
| i18n | next-intl (FR/EN) |
| Forms | React Hook Form + Zod resolver |
| State | Zustand (global) + React Query (server) |
| Icons | Lucide React |
| Animations | Framer Motion |
| Charts | Recharts |
| Dates | date-fns |

## Structure existante

```
app/
├── [locale]/                          # i18n routing (fr, en)
│   ├── layout.tsx                     # Root layout, providers
│   ├── page.tsx                       # Home page marketing
│   ├── (marketing)/
│   │   ├── pricing/page.tsx           # Plans et tarifs
│   │   ├── investors/page.tsx         # Page investisseurs
│   │   ├── contact/page.tsx           # Formulaire contact
│   │   └── legal/
│   │       ├── terms/page.tsx         # CGU
│   │       └── privacy/page.tsx       # Politique de confidentialite
│   ├── (auth)/
│   │   ├── login/page.tsx             # Connexion
│   │   ├── register/page.tsx          # Inscription (quand ouvert)
│   │   ├── forgot-password/page.tsx   # Demande reset
│   │   └── reset-password/page.tsx    # Reset avec token
│   ├── (dashboard)/
│   │   ├── layout.tsx                 # Dashboard shell (sidebar, header)
│   │   ├── overview/page.tsx          # Vue d'ensemble
│   │   ├── audits/
│   │   │   ├── page.tsx               # Liste des audits
│   │   │   ├── new/page.tsx           # Nouvel audit
│   │   │   └── [id]/page.tsx          # Detail audit + streaming
│   │   ├── chat/page.tsx              # Chat AI (interface principale)
│   │   ├── settings/page.tsx          # Parametres user
│   │   └── api-keys/page.tsx          # Gestion API keys
│   └── (admin)/
│       ├── layout.tsx                 # Admin shell
│       ├── users/page.tsx             # Gestion users
│       ├── agents/page.tsx            # Monitoring agents
│       ├── gateway/page.tsx           # Config gateway
│       ├── llm/page.tsx               # Config LLM providers
│       ├── logs/page.tsx              # Audit logs
│       ├── monitoring/page.tsx        # Health + metrics
│       └── settings/page.tsx          # Platform settings
├── api/
│   ├── auth/[...slug]/route.ts        # Proxy vers backend
│   ├── beta/route.ts                  # Inscription beta
│   └── contact/route.ts              # Formulaire contact
├── actions/
│   └── auth.ts                        # Server actions auth
├── middleware.ts                       # CSP nonce, locale, auth redirect
└── globals.css                        # Tailwind + variables CSS
```

## Composants cles

### Chat UI (`components/dashboard/chat/`)

Le composant central de BJHUNT — l'interface de streaming live.

```
components/dashboard/chat/
├── chat-interface.tsx       # Container principal
├── chat-input.tsx           # Zone de saisie + envoi
├── chat-messages.tsx        # Liste des messages
├── chat-sidebar.tsx         # Historique des conversations
├── model-selector.tsx       # Selection du modele LLM
├── file-upload.tsx          # Upload de fichiers
├── voice-recorder.tsx       # Enregistrement vocal
├── agent-thinking.tsx       # Affichage pensee agent (typing)
├── tool-execution.tsx       # Bloc terminal (commande + output)
├── finding-card.tsx         # Card de vulnerabilite
├── progress-bar.tsx         # Progression de l'audit
└── agent-transition.tsx     # Animation switch agent
```

### Dashboard Shell (`components/dashboard/dashboard-shell.tsx`)

```
┌──────────────────────────────────────────────────────┐
│  HEADER                                               │
│  [Logo] [Search] [Notifications] [User Menu]          │
├──────────┬───────────────────────────────────────────┤
│ SIDEBAR  │  MAIN CONTENT                             │
│          │                                           │
│ Overview │  (varie selon la page)                    │
│ Audits   │                                           │
│ Chat     │                                           │
│ -------- │                                           │
│ Settings │                                           │
│ API Keys │                                           │
│ -------- │                                           │
│ Admin    │                                           │
│ (if role)│                                           │
│          │                                           │
└──────────┴───────────────────────────────────────────┘
```

## Integration Backend

### Backend Client

```typescript
// lib/backend-client.ts
export function getBackendBaseUrl(): string {
  return process.env.BJHUNT_BACKEND_URL || 'https://api.bjhunt.com';
}

export async function backendFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${getBackendBaseUrl()}${path}`;
  const headers = new Headers(options.headers);

  // Ajouter le cookie de session (server-side)
  const session = await getSessionCookie();
  if (session) {
    headers.set('Cookie', `session=${session}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}
```

### Server Actions (Auth)

```typescript
// app/actions/auth.ts
'use server';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const res = await backendFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    return { error: error.message };
  }

  // Set session cookie from backend response
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    cookies().set(parseSetCookie(setCookie));
  }

  redirect('/overview');
}
```

### Streaming Hook

```typescript
// hooks/use-audit-stream.ts
import { connectStream, StreamEvent } from '@/lib/streaming';

export function useAuditStream(jobId: string | null) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'streaming' | 'error' | 'complete'>('idle');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [currentThought, setCurrentThought] = useState('');

  useEffect(() => {
    if (!jobId) return;

    setStatus('connecting');
    const token = getSessionToken();

    const disconnect = connectStream(jobId, token, {
      onEvent: (event) => {
        setEvents(prev => [...prev, event]);
        setStatus('streaming');

        switch (event.type) {
          case 'agent_thinking':
            setCurrentThought(prev => prev + event.token);
            setActiveAgent(event.agent);
            break;
          case 'tool_call':
            setCurrentThought(''); // Reset thought on tool call
            break;
          case 'finding':
            setFindings(prev => [...prev, event as Finding]);
            break;
          case 'agent_switch':
            setActiveAgent(event.to);
            setCurrentThought('');
            break;
          case 'complete':
            setStatus('complete');
            break;
        }
      },
      onError: () => setStatus('error'),
      onComplete: () => setStatus('complete'),
    });

    return disconnect;
  }, [jobId]);

  return { events, status, findings, activeAgent, currentThought };
}
```

## Middleware (CSP)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const response = NextResponse.next();

  // CSP strict-dynamic, nonce-based, PAS de unsafe-eval
  const csp = [
    `default-src 'self'`,
    `script-src 'strict-dynamic' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self' https://api.bjhunt.com wss://api.bjhunt.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Nonce', nonce);

  return response;
}
```

## i18n

Deux locales : `fr` (defaut) et `en`.

```
messages/
├── fr.json
└── en.json
```

Toutes les strings UI passent par `next-intl`.
Les messages systeme (erreurs, notifications) sont traduits cote frontend.
Les findings et rapports sont en anglais (standard de l'industrie securite).

## Pages a creer/adapter

### Nouvelles pages

| Page | Route | Description |
|---|---|---|
| New Audit | `/audits/new` | Formulaire de creation d'audit (target, scope, RoE) |
| Audit Detail | `/audits/[id]` | Vue streaming live + resultats |
| Audit Report | `/audits/[id]/report` | Rapport de vulnerabilites formate |

### Pages a adapter

| Page | Route | Adaptation necessaire |
|---|---|---|
| Overview | `/overview` | Connecter aux vrais stats (audits, findings) |
| Chat | `/chat` | Connecter au streaming LangGraph |
| Settings | `/settings` | Connecter au backend (profil, preferences) |
| API Keys | `/api-keys` | CRUD API keys via backend |
| Admin Users | `/admin/users` | CRUD users via backend |
| Admin Agents | `/admin/agents` | Status reel des agents Decepticon |
| Admin LLM | `/admin/llm` | Config LiteLLM providers |
| Admin Logs | `/admin/logs` | Audit logs depuis PostgreSQL |
| Admin Monitoring | `/admin/monitoring` | Health checks, metriques, queue BullMQ |

## Performance

| Metrique | Cible | Comment |
|---|---|---|
| FCP (First Contentful Paint) | < 1.5s | SSR Vercel Edge |
| LCP (Largest Contentful Paint) | < 2.5s | Image optimization, lazy loading |
| CLS (Cumulative Layout Shift) | < 0.1 | Skeleton loaders, reserved space |
| TTFB (Time To First Byte) | < 200ms | Vercel Edge CDN Paris |
| TTI (Time To Interactive) | < 3.5s | Code splitting, tree shaking |
| Stream TTFT | < 500ms | SSE direct, zero buffering |
