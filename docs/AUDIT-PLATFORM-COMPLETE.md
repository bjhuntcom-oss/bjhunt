# BJHUNT Platform Audit — Fonctionnalites & Implementations Manquantes

> Audit complet realise le 15 avril 2026 — fichier par fichier, page par page.

---

## Table des matieres

1. [Dashboard User](#1-dashboard-user)
2. [Dashboard Admin](#2-dashboard-admin)
3. [Pages Marketing & Auth](#3-pages-marketing--auth)
4. [Routes API Backend](#4-routes-api-backend)
5. [Composants UI/UX](#5-composants-uiux)
6. [Base de donnees](#6-base-de-donnees)
7. [Integration Backend ↔ Frontend](#7-integration-backend--frontend)
8. [Todolist Implementation](#8-todolist-implementation)

---

## 1. Dashboard User

### 1.1 Overview (`/dashboard`)
**Fichier:** `app/[locale]/dashboard/page.tsx`
**But:** Vue d'ensemble avec stats, scans recents, sante AI, usage tokens
**Statut:** PARTIEL

| Fonctionnalite | Statut | Detail |
|---|---|---|
| Greeting utilisateur | OK | Affiche displayName depuis `/api/auth/me` |
| 4 stat cards (scans, critical, high, latency) | OK | Depuis `/api/dashboard/stats` |
| Recent scans list | OK | Depuis `/api/engagements?limit=10` |
| AI Health status | OK | Depuis `/api/health/ready` |
| Token quota progress bar | FALLBACK | Valeurs par defaut 0/2M si endpoint echoue |
| 7-day scan chart | OK | Depuis `dashboard/stats.scansPerDay` |
| Severity distribution chart | FALLBACK | Tableau vide si pas de donnees |
| Plan info + upgrade CTA | HARDCODE | Toujours "Free plan" — pas de billing |
| Admin-only: users count | OK | Depuis `/api/admin/users?limit=1` |
| Admin-only: audit logs recents | OK | Depuis `/api/admin/settings/audit-logs?limit=5` |
| Admin-only: service health checks | OK | Depuis `/api/health/ready` |

**Manquant:**
- Systeme de billing/plans (Free/Pro/Enterprise) — toujours hardcode "Free"
- Quota tokens reel (pas de tracking cote backend au-dela des agent_runs)
- Graphique 7 jours vide si aucun scan

---

### 1.2 Chat AI (`/dashboard/chat`)
**Fichier:** `app/[locale]/dashboard/chat/page.tsx`
**But:** Interface conversationnelle pour lancer et piloter des audits de securite
**Statut:** PARTIEL

| Fonctionnalite | Statut | Detail |
|---|---|---|
| Creation engagement | OK | POST `/api/engagements` |
| Liste sessions (sidebar) | OK | GET `/api/engagements` |
| Envoi message + streaming SSE | OK | POST `/api/chat/stream` |
| Historique conversations | OK | GET `/api/chat/history/{id}` |
| Messages d'une conversation | OK | GET `/api/chat/conversations/{id}/messages` |
| Affichage tool calls | OK | Reconstruit depuis metadata du stream |
| Affichage thinking blocks | OK | Depuis stream events |
| Affichage sub-agents | OK | Depuis stream events |
| Knowledge graph panel | SHELL | Structure UI presente, pas de donnees persistees |
| Operational plan panel | SHELL | Structure UI presente, objectifs depuis stream seulement |
| Artifact panel | SHELL | Structure UI vide, pas de backend |
| File upload | MANQUANT | UI existe, endpoint `/api/chat/files` inexistant |
| Voice recorder | SHELL | UI existe, aucune fonctionnalite |
| Slash commands | SHELL | UI framework, pas de commandes implementees |
| Model selector | SHELL | UI presente, pas de switch reel de modele |
| Model settings (temperature etc) | SHELL | UI presente, parametres non envoyes au backend |
| Prompt library | OK | Fonctionne en localStorage (15+ prompts builtin) |
| Conversation search | SHELL | UI existe, pas de backend search |
| Conversation rename/pin/delete | LOCAL | localStorage seulement, pas persiste |
| Export markdown | OK | Cote client, fonctionne |
| Regenerate message | SHELL | UI existe, pas d'endpoint regenerate |
| Fork conversation | SHELL | UI existe, pas d'endpoint fork |

**Manquant backend:**
- `POST /api/chat/files` — Upload de fichiers
- `GET /api/chat/files/{id}` — Telechargement fichiers
- `POST /api/chat/conversations` — Creation conversation
- `DELETE /api/chat/conversations/{id}` — Suppression conversation
- Switch de modele LLM en temps reel
- Parametres de generation (temperature, max_tokens) non transmis
- Persistence knowledge graph et artifacts
- Regeneration/fork de messages

---

### 1.3 Audits (`/dashboard/audits`)
**Fichiers:** `app/[locale]/dashboard/audits/page.tsx`, `audits-client.tsx`
**But:** Liste et gestion des audits de securite
**Statut:** IMPLEMENTE

| Fonctionnalite | Statut | Detail |
|---|---|---|
| Liste des audits | OK | GET `/api/engagements?limit=20` |
| Creation audit (title + target) | OK | POST `/api/engagements` |
| Annulation audit | OK | PATCH `/api/engagements/{id}` |
| Lien vers detail | OK | Navigation vers `/audits/{id}` |
| Status color-coded | OK | Badges colores par statut |
| Pagination | MANQUANT | UI prete, pas d'implementation |

---

### 1.4 Detail Audit (`/dashboard/audits/[id]`)
**Fichier:** `app/[locale]/dashboard/audits/[id]/page.tsx`
**But:** Vue detaillee d'un audit avec findings
**Statut:** IMPLEMENTE

| Fonctionnalite | Statut | Detail |
|---|---|---|
| Detail engagement | OK | GET `/api/engagements/{id}` |
| Liste findings | OK | GET `/api/engagements/{id}/findings` |
| Severity badges | OK | Colores par severite |
| CVE, CVSS, MITRE | OK | Affiches si presents |
| Remediation | OK | Affichee si presente |
| Export rapport | MANQUANT | Pas d'export PDF/CSV |
| Re-run audit | MANQUANT | Pas de bouton relancer |

---

### 1.5 Settings (`/dashboard/settings`)
**Fichier:** `app/[locale]/dashboard/settings/page.tsx`
**But:** Parametres du compte utilisateur
**Statut:** IMPLEMENTE

| Fonctionnalite | Statut | Detail |
|---|---|---|
| Affichage email (read-only) | OK | Depuis `/api/auth/me` |
| Modifier display name | OK | PATCH `/api/auth/me` |
| Changer mot de passe | OK | POST `/api/auth/change-password` (14+ chars) |
| API Keys — liste | OK | GET `/api/keys` |
| API Keys — creer | OK | POST `/api/keys` + reveal une fois |
| API Keys — revoquer | OK | DELETE `/api/keys/{id}` |
| Theme/langue | MANQUANT | Pas de toggle theme, langue via cookie |
| Notifications preferences | MANQUANT | Pas d'UI de preferences |
| 2FA/MFA | MANQUANT | Pas d'implementation |
| Delete account | MANQUANT | Pas d'option |

---

## 2. Dashboard Admin

### 2.1 Users (`/dashboard/admin/users`)
**Fichiers:** `admin/users/page.tsx`, `user-actions-panel.tsx`, `sessions-panel.tsx`
**But:** Gestion des utilisateurs de la plateforme
**Statut:** IMPLEMENTE

| Fonctionnalite | Statut | Detail |
|---|---|---|
| Liste utilisateurs | OK | GET `/api/admin/users` |
| Stats (total, actifs, bloques, admins) | OK | Calcule cote client |
| Block/unblock user | OK | PATCH `/api/admin/users/{id}` (role toggle) |
| Supprimer user | OK | DELETE `/api/admin/users/{id}` avec double confirm |
| Voir sessions user | OK | GET `/api/admin/users/{id}/sessions` |
| Revoquer sessions | OK | POST `/api/admin/users/{id}/revoke-sessions` |
| Creer user admin | OK | POST `/api/admin/users` |
| Recherche/filtre | MANQUANT | Table statique sans filtre |
| Pagination | MANQUANT | Charge tout d'un coup |
| Modifier role precis | MANQUANT | Seulement toggle member↔viewer |
| Export users | MANQUANT | Pas d'export CSV |

---

### 2.2 Agents (`/dashboard/admin/agents`)
**Fichiers:** `admin/agents/page.tsx`, `agents-client.tsx`
**But:** Gestion des profils d'agents IA (SOUL.md/AGENTS.md)
**Statut:** FAKE (UI shell, backend 404)

| Fonctionnalite | Statut | Detail |
|---|---|---|
| Liste agents | PARTIEL | GET `/api/admin/settings/agents` fonctionne (LangGraph) |
| Creer agent | FAKE | POST `/api/admin/agents` → 404 |
| Modifier agent | FAKE | PATCH `/api/admin/agents/{id}` → 404 |
| Supprimer agent | FAKE | DELETE `/api/admin/agents/{id}` → 404 |
| Activer agent | FAKE | POST `/api/admin/agents/{id}/activate` → 404 |
| Editor SOUL.md | FAKE | UI existe mais save ne fonctionne pas |
| Editor AGENTS.md | FAKE | UI existe mais save ne fonctionne pas |
| Badge actif/defaut | OK | Affichage depuis data initiale |

**Manquant backend:**
- `GET /api/admin/agents/{id}` — Detail agent
- `POST /api/admin/agents` — Creation
- `PATCH /api/admin/agents/{id}` — Modification
- `DELETE /api/admin/agents/{id}` — Suppression
- `POST /api/admin/agents/{id}/activate` — Activation
- Table `agent_profiles` dans le schema DB

---

### 2.3 Gateway LLM (`/dashboard/admin/gateway`)
**Fichiers:** `admin/gateway/page.tsx`, `providers-client.tsx`, `ollama-models.tsx`, `[providerId]/`
**But:** Configuration des providers LLM (Anthropic, OpenAI, Ollama, etc.)
**Statut:** FAKE (UI avec data hardcodee, backend 404)

| Fonctionnalite | Statut | Detail |
|---|---|---|
| Liste providers | HARDCODE | Fallback vers Anthropic/OpenAI/Ollama hardcodes |
| Modele par defaut | FAKE | PATCH `/api/admin/gateway/defaults` → 404 |
| Tester connexion | FAKE | POST `/api/admin/gateway/providers/{id}/test` → 404 |
| Editer provider | FAKE | Page existe, POST save → 404 |
| Supprimer provider | FAKE | DELETE → 404 |
| Creer provider | FAKE | Formulaire complet mais → 404 |
| Config modeles | FAKE | UI complete (context, tokens, reasoning) mais → 404 |
| Ollama — liste modeles | FAKE | GET `/api/admin/ollama/models` → 404 |
| Ollama — pull modele | FAKE | POST `/api/admin/ollama/models/pull` → 404 |
| Ollama — delete modele | FAKE | DELETE → 404 |

**Manquant backend:**
- `GET /api/admin/gateway/config` — Config complete gateway
- `PATCH /api/admin/gateway/defaults` — Modele par defaut
- `POST /api/admin/gateway/providers/{id}` — Save provider
- `POST /api/admin/gateway/providers/{id}/test` — Test connexion
- `DELETE /api/admin/gateway/providers/{id}` — Supprimer
- `GET /api/admin/ollama/models` — Liste modeles Ollama
- `POST /api/admin/ollama/models/pull` — Installer modele
- `DELETE /api/admin/ollama/models/{name}` — Supprimer modele
- Table `gateway_providers` dans le schema DB
- Logique de test de connexion LLM

---

### 2.4 Logs (`/dashboard/admin/logs`)
**Fichiers:** `admin/logs/page.tsx`, `audit-logs-viewer.tsx`
**But:** Consultation des logs d'audit de la plateforme
**Statut:** IMPLEMENTE

| Fonctionnalite | Statut | Detail |
|---|---|---|
| Liste paginee | OK | GET `/api/admin/settings/audit-logs` avec offset/limit |
| Filtre par action | OK | Param `action` |
| Filtre par user | PARTIEL | UI existe, filtre backend non verifie |
| Filtre par resource type | PARTIEL | UI existe, filtre backend non verifie |
| Filtre par date | PARTIEL | UI existe, params `from`/`to` a verifier |
| Detail payload expandable | OK | JSON brut affiches |
| Export CSV | OK | Export cote client |
| Pagination | OK | 50 par page |

---

### 2.5 Monitoring (`/dashboard/admin/monitoring`)
**Fichiers:** `admin/monitoring/page.tsx`, `monitoring-dashboard.tsx`
**But:** Surveillance sante des services et queue d'agents
**Statut:** IMPLEMENTE

| Fonctionnalite | Statut | Detail |
|---|---|---|
| Queue stats (total, running, completed, failed) | OK | GET `/api/admin/settings/agent-runs` |
| Service health (PG, Redis, LangGraph) | OK | GET `/api/health/ready` |
| Auto-refresh 10s | OK | setInterval cote client |
| Refresh manuel | OK | Bouton refresh |
| Badge Operational/Degraded | OK | Calcule depuis checks |
| SearXNG health | AFFICHÉ | Mais pas checke par le backend |
| Storage health | AFFICHÉ | Mais pas checke par le backend |
| Alertes/notifications | MANQUANT | Pas de systeme d'alerte |
| Historique sante | MANQUANT | Pas de graph d'uptime |
| Metriques detaillees | MANQUANT | Pas de CPU/RAM/disk |

---

### 2.6 Settings (`/dashboard/admin/settings`)
**Fichiers:** `admin/settings/page.tsx`, `platform-settings-form.tsx`
**But:** Configuration globale de la plateforme
**Statut:** IMPLEMENTE (minimal)

| Fonctionnalite | Statut | Detail |
|---|---|---|
| Nom plateforme | OK | PUT `/api/admin/settings` |
| Description plateforme | OK | PUT `/api/admin/settings` |
| Configuration email | MANQUANT | Pas de config SMTP |
| Configuration securite | MANQUANT | Pas de rate limit config, CSP, etc. |
| Maintenance mode | MANQUANT | Pas de toggle maintenance |
| Branding (logo, couleurs) | MANQUANT | Pas de customisation visuelle |
| Backup/restore | MANQUANT | Pas d'interface de backup |

---

## 3. Pages Marketing & Auth

### 3.1 Pages publiques

| Page | Fichier | Statut | Detail |
|---|---|---|---|
| Home | `page.tsx` | OK | Hero, features, pricing teaser, CTA |
| Pricing | `pricing/page.tsx` | OK | Free/Pro/Enterprise, FAQs — tout hardcode |
| Investors | `investors/page.tsx` | OK | Stats, value prop — tout hardcode |
| Contact | `contact/page.tsx` | OK | Form + hCaptcha + email Resend |
| API Docs | `api-docs/page.tsx` | OK | Documentation basique 5 endpoints |
| Legal | `legal/page.tsx` | OK | Mentions legales completes |
| Beta | `beta/page.tsx` | OK | Form inscription + hCaptcha |

### 3.2 Pages auth

| Page | Fichier | Statut | Detail |
|---|---|---|---|
| Login/Register | `login/page.tsx` | OK | Toggle login/register, server actions |
| Forgot password | `forgot-password/page.tsx` | OK | Email input, confirmation UI |
| Reset password | `reset-password/page.tsx` | OK | Token + new password |

**Probleme:** L'envoi d'email de reset password n'est PAS implemente (TODO dans `backend/src/routes/auth.ts:236`). Le token est seulement log en console en mode dev.

---

## 4. Routes API Backend

### 4.1 Routes IMPLEMENTEES

| Route | Methode | Auth | Statut |
|---|---|---|---|
| `/api/auth/register` | POST | Non | OK |
| `/api/auth/login` | POST | Non | OK |
| `/api/auth/me` | GET | Session | OK |
| `/api/auth/me` | PATCH | Session | OK |
| `/api/auth/logout` | POST | Session | OK |
| `/api/auth/forgot-password` | POST | Non | PARTIEL (pas d'email) |
| `/api/auth/reset-password` | POST | Non | OK |
| `/api/auth/change-password` | POST | Session | OK |
| `/api/health/live` | GET | Non | OK |
| `/api/health/ready` | GET | Non | OK |
| `/api/health/version` | GET | Non | OK |
| `/api/engagements` | GET | Session | OK |
| `/api/engagements` | POST | Session | OK |
| `/api/engagements/{id}` | GET | Session | OK |
| `/api/engagements/{id}` | PATCH | Session | OK |
| `/api/engagements/{id}` | DELETE | Session | OK |
| `/api/engagements/{id}/findings` | GET | Session | OK |
| `/api/engagements/{id}/findings` | POST | Session | OK |
| `/api/engagements/{id}/runs` | GET | Session | OK |
| `/api/engagements/{id}/launch` | POST | Session | OK (need LangGraph) |
| `/api/chat/stream` | POST | Session | OK (need LangGraph) |
| `/api/chat/history/{id}` | GET | Session | OK |
| `/api/chat/conversations/{id}/messages` | GET | Session | OK |
| `/api/chat/conversations` | GET | Session | OK |
| `/api/dashboard/stats` | GET | Session | OK |
| `/api/keys` | GET | Session | OK |
| `/api/keys` | POST | Session | OK |
| `/api/keys/{id}` | DELETE | Session | OK |
| `/api/notifications` | GET | Session | OK |
| `/api/notifications/count` | GET | Session | OK |
| `/api/notifications/read` | POST | Session | OK |
| `/api/admin/users` | GET | Admin | OK |
| `/api/admin/users` | POST | Admin | OK |
| `/api/admin/users/{id}` | PATCH | Admin | OK |
| `/api/admin/users/{id}` | DELETE | Admin | OK |
| `/api/admin/users/{id}/sessions` | GET | Admin | OK |
| `/api/admin/users/{id}/revoke-sessions` | POST | Admin | OK |
| `/api/admin/settings` | GET | Admin | OK |
| `/api/admin/settings` | PUT | Admin | OK |
| `/api/admin/settings/audit-logs` | GET | Admin | OK |
| `/api/admin/settings/agent-runs` | GET | Admin | OK |
| `/api/admin/settings/agents` | GET | Admin | OK (proxy LangGraph) |

### 4.2 Routes MANQUANTES (frontend attend, backend 404)

| Route | Methode | Attendu par | Priorite |
|---|---|---|---|
| `/api/chat/files` | POST | chat/page.tsx — file upload | HAUTE |
| `/api/chat/files/{id}` | GET | chat/page.tsx — file download | HAUTE |
| `/api/chat/conversations` | POST | use-chat-api.ts — creation conversation | MOYENNE |
| `/api/chat/conversations/{id}` | DELETE | use-chat-api.ts — suppression conversation | MOYENNE |
| `/api/admin/agents` | GET | agents-client.tsx — liste agents | HAUTE |
| `/api/admin/agents` | POST | agents-client.tsx — creation | HAUTE |
| `/api/admin/agents/{id}` | GET | agents-client.tsx — detail | HAUTE |
| `/api/admin/agents/{id}` | PATCH | agents-client.tsx — modification | HAUTE |
| `/api/admin/agents/{id}` | DELETE | agents-client.tsx — suppression | HAUTE |
| `/api/admin/agents/{id}/activate` | POST | agents-client.tsx — activation | HAUTE |
| `/api/admin/gateway/config` | GET | gateway/page.tsx — config | HAUTE |
| `/api/admin/gateway/defaults` | PATCH | providers-client.tsx — defaut | HAUTE |
| `/api/admin/gateway/providers/{id}` | POST | provider-edit-form.tsx — save | HAUTE |
| `/api/admin/gateway/providers/{id}/test` | POST | providers-client.tsx — test | HAUTE |
| `/api/admin/gateway/providers/{id}` | DELETE | providers-client.tsx — supprimer | HAUTE |
| `/api/admin/ollama/models` | GET | ollama-models.tsx — liste | BASSE |
| `/api/admin/ollama/models/pull` | POST | ollama-models.tsx — installer | BASSE |
| `/api/admin/ollama/models/{name}` | DELETE | ollama-models.tsx — supprimer | BASSE |

---

## 5. Composants UI/UX

### 5.1 Composants fonctionnels

| Composant | Fichier | Statut |
|---|---|---|
| Dashboard Shell (sidebar + layout) | `components/dashboard/dashboard-shell.tsx` | OK |
| Bar Chart | `components/dashboard/bar-chart.tsx` | OK |
| Message Bubble (markdown + syntax) | `components/chat/message-bubble.tsx` | OK |
| Tool Call Block | `components/chat/tool-call-block.tsx` | OK |
| Thinking Block | `components/chat/thinking-block.tsx` | OK |
| Sub Agent Card | `components/chat/sub-agent-card.tsx` | OK |
| Prompt Library | `components/chat/prompt-library-panel.tsx` | OK |
| Chat Input | `components/chat/chat-input.tsx` | OK |
| Chat Topbar | `components/chat/chat-topbar.tsx` | OK |
| Conversation Sidebar | `components/chat/conversation-sidebar.tsx` | OK (localStorage) |
| All shadcn/ui components | `components/ui/*` | OK |
| All animations | `components/animations/*` | OK |
| Header + Footer | `components/layout/*` | OK |

### 5.2 Composants shells (UI sans backend)

| Composant | Fichier | Manque |
|---|---|---|
| Artifact Panel | `components/chat/artifact-panel.tsx` | Backend artifacts |
| Knowledge Graph Panel | `components/chat/knowledge-graph-panel.tsx` | Persistence graph |
| OpPlan Panel | `components/chat/opplan-panel.tsx` | Persistence objectifs |
| Model Selector | `components/chat/model-selector.tsx` | Switch modele reel |
| Model Settings Panel | `components/chat/model-settings-panel.tsx` | Envoi params au backend |
| Slash Commands | `components/chat/slash-commands.tsx` | Implementation commandes |
| Voice Recorder | `components/chat/voice-recorder.tsx` | Transcription audio |
| File Upload Zone | `components/chat/file-upload-zone.tsx` | Endpoint upload |
| Message Actions | `components/chat/message-actions.tsx` | Regenerate, fork, edit |

### 5.3 Composant potentiellement orphelin

| Composant | Fichier | Detail |
|---|---|---|
| Control Plane Chat | `components/dashboard/control-plane-chat.tsx` | Chat alternatif complet mais non utilise dans les routes actuelles |
| AI Prompt Box | `components/ui/ai-prompt-box.tsx` | Pas d'import detecte |
| Scan Card | `components/ui/scan-card.tsx` | Rarement importe |

### 5.4 Problemes UX identifies

| Probleme | Localisation | Severite |
|---|---|---|
| Pas de skeleton/loading sur fetch | Plusieurs pages dashboard | MOYENNE |
| Pas d'error boundary React | Aucun wrapping | MOYENNE |
| Session expiree = redirect silencieux | middleware.ts | BASSE |
| Pas de toast/notification sur erreur API | Global | MOYENNE |
| Sidebar nav ne montre pas la page active clairement | dashboard-shell.tsx | BASSE |
| Pas de confirmation avant quitter chat | chat/page.tsx | BASSE |
| Responsive admin tables | Tables admin | BASSE |

---

## 6. Base de donnees

### 6.1 Tables existantes (schema.sql)

| Table | Utilisee | Detail |
|---|---|---|
| organizations | OK | Tenants |
| users | OK | Comptes |
| sessions | OK | Sessions auth |
| api_keys | OK | Cles API |
| engagements | OK | Audits/scans |
| findings | OK | Vulnerabilites |
| audit_logs | OK | Logs d'audit |
| password_reset_tokens | OK | Reset mdp |
| platform_settings | OK | Config globale |
| chat_conversations | OK | Conversations |
| chat_messages | OK | Messages |
| agent_runs | OK | Executions agents |
| notifications | OK | Notifications |

### 6.2 Tables MANQUANTES

| Table | Necessaire pour | Priorite |
|---|---|---|
| agent_profiles | Admin agents CRUD | HAUTE |
| gateway_providers | Config LLM providers | HAUTE |
| gateway_models | Modeles par provider | HAUTE |
| file_uploads | Chat file attachments | HAUTE |
| billing_plans | Plans Free/Pro/Enterprise | MOYENNE |
| billing_subscriptions | Abonnements users | MOYENNE |
| billing_invoices | Factures | BASSE |
| user_preferences | Theme, langue, notifs | BASSE |
| token_usage | Tracking usage detaille | MOYENNE |

---

## 7. Integration Backend ↔ Frontend

### 7.1 Config actuelle
- Frontend: `NEXT_PUBLIC_BACKEND_URL` ou `BACKEND_API_URL` → defaut `http://127.0.0.1:3001`
- Backend: Hono+Bun sur port 3001
- Auth: Cookie `bjhunt_session` HttpOnly, 30 jours
- Proxy: `app/api/auth/[...slug]/route.ts` forward vers backend

### 7.2 Problemes d'integration

| Probleme | Detail | Severite |
|---|---|---|
| Email reset password | `TODO` dans `auth.ts:236` — token log en console seulement | HAUTE |
| Rate limiter in-memory | `/api/beta` et `/api/contact` — perdu au restart | MOYENNE |
| Pas de Redis rate limiting | Backend a Redis mais rate limit non configure partout | MOYENNE |
| Health check incomplet | SearXNG et Storage affiches dans monitoring mais non checkes | BASSE |
| Backend URL resolution | Client et serveur utilisent la meme fonction | BASSE |

---

## 8. Todolist Implementation

### PRIORITE CRITIQUE (P0) — Bloque l'utilisation

- [ ] **Backend: Email forgot-password** — Implementer envoi email avec token via Resend ou SMTP
- [ ] **Backend: Routes admin/agents CRUD** — 6 endpoints pour gerer les profils agents
- [ ] **Backend: Routes admin/gateway CRUD** — 5+ endpoints pour gerer les providers LLM
- [ ] **DB: Table agent_profiles** — Schema + migrations
- [ ] **DB: Table gateway_providers + gateway_models** — Schema + migrations

### PRIORITE HAUTE (P1) — Features visibles cassees

- [ ] **Backend: Chat file upload** — POST `/api/chat/files` avec multipart
- [ ] **Backend: Chat file download** — GET `/api/chat/files/{id}`
- [ ] **Backend: Chat conversation CRUD** — POST create, DELETE conversation
- [ ] **Backend: Gateway test connexion** — Logique de test par provider (Anthropic, OpenAI, etc.)
- [ ] **Backend: Ollama model management** — 3 endpoints si Ollama utilise
- [ ] **Frontend: Error boundaries** — Wrapper React error boundary sur les sections majeures
- [ ] **Frontend: Loading skeletons** — Skeleton UI pendant les chargements
- [ ] **Frontend: Toast notifications** — Systeme de notification global pour erreurs API

### PRIORITE MOYENNE (P2) — Ameliorations UX importantes

- [ ] **Backend: Admin users search/filter** — Parametre `search` sur GET `/api/admin/users`
- [ ] **Frontend: Pagination audits** — Implementer offset/limit cote client
- [ ] **Frontend: Pagination users admin** — Idem
- [ ] **Frontend: Audit logs filtres** — Verifier que `userId`, `resourceType`, `from`, `to` fonctionnent cote backend
- [ ] **Frontend: Chat model switch** — Envoyer le modele selectionne dans `/api/chat/stream`
- [ ] **Frontend: Chat model settings** — Envoyer temperature, max_tokens
- [ ] **Backend: Rate limiting Redis** — Remplacer rate limiter in-memory par Redis
- [ ] **Frontend: Export rapport audit** — PDF ou CSV des findings
- [ ] **Backend: Billing plans** — Table + logique Free/Pro/Enterprise
- [ ] **Backend: Token usage tracking** — Tracking detaille par user/org

### PRIORITE BASSE (P3) — Nice to have

- [ ] **Frontend: User preferences** — Theme, langue, parametres notifications
- [ ] **Frontend: Admin settings etendus** — SMTP config, rate limit config, maintenance mode
- [ ] **Frontend: Knowledge graph persistence** — Sauvegarder graph dans DB
- [ ] **Frontend: Artifact panel** — Backend storage + rendering
- [ ] **Frontend: Voice recorder** — Integration STT (Whisper?)
- [ ] **Frontend: Slash commands** — Implementation commandes chat
- [ ] **Frontend: Admin branding** — Logo, couleurs custom
- [ ] **Frontend: 2FA/MFA** — TOTP ou WebAuthn
- [ ] **Frontend: Delete account** — Workflow de suppression
- [ ] **Frontend: Conversation search** — Recherche full-text dans les conversations
- [ ] **Frontend: Message regenerate/fork** — Backend endpoints
- [ ] **Backend: Health check SearXNG** — Ajouter au readiness probe
- [ ] **Backend: Health check Storage** — Idem
- [ ] **Frontend: Monitoring historique** — Graph d'uptime
- [ ] **Frontend: Monitoring metriques** — CPU/RAM/disk depuis VPS
- [ ] **Cleanup: control-plane-chat.tsx** — Supprimer ou integrer le composant orphelin
- [ ] **Cleanup: ai-prompt-box.tsx** — Verifier usage, supprimer si orphelin

---

## Resume executif

| Section | Total fonctionnalites | OK | Partiel | Fake/Manquant |
|---|---|---|---|---|
| Dashboard User (5 pages) | 48 | 30 | 6 | 12 |
| Dashboard Admin (6 sections) | 41 | 24 | 4 | 13 |
| Pages Marketing | 7 | 7 | 0 | 0 |
| Pages Auth | 3 | 2 | 1 | 0 |
| Routes API Backend | 58 | 40 | 0 | 18 |
| Composants UI | 27 | 14 | 4 | 9 |
| **TOTAL** | **184** | **117 (64%)** | **15 (8%)** | **52 (28%)** |

**28% des fonctionnalites affichees dans l'UI sont fake ou manquantes.** Les sections les plus touchees sont :
1. **Admin Agents** — quasi entierement fake
2. **Admin Gateway** — quasi entierement fake
3. **Chat avance** — file upload, model switch, regenerate, fork, artifacts, voice
4. **Billing/Plans** — inexistant (toujours "Free")
