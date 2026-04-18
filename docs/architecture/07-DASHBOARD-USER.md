# 07 — Dashboard User

> Audit exhaustif du frontend existant. Chaque bouton, chaque champ, chaque appel API.
> Source : `app/[locale]/dashboard/`, `components/dashboard/`, `components/chat/`

## Navigation Sidebar

**Composant** : `components/dashboard/dashboard-shell.tsx`
**Comportement** : Collapsible (220px ↔ 56px), responsive (overlay on mobile)

### Items de navigation

| # | Label | Route | Icone | Badge | Visible |
|---|---|---|---|---|---|
| 1 | Chat AI | `/dashboard/chat` | MessageSquare | — | Tous |
| 2 | Overview | `/dashboard` | BarChart2 | — | Tous |
| 3 | Scans | `/dashboard/audits` | ShieldCheck | — | Tous |
| 4 | Findings | `/dashboard/findings` | AlertTriangle | — | Tous |
| 5 | CVE Intel | `/dashboard/cve` | ShieldAlert | `pro` | Tous |
| 6 | Skills | `/dashboard/skills` | BookOpen | `pro` | Tous |
| 7 | Tools | `/dashboard/tools` | Terminal | `enterprise` | Tous |
| 8 | Guide | `/dashboard/guide` | HelpCircle | — | Tous |
| 9 | Settings | `/dashboard/settings` | Settings | — | Tous |

**Section Workflows** (collapsible) :

| # | Label | Route | Icone | Badge |
|---|---|---|---|---|
| 10 | Cloud | `/dashboard/cloud` | Cloud | `enterprise` |
| 11 | AD | `/dashboard/ad` | Database | `enterprise` |

**Section Admin** (visible si `user.role === 'platform_admin'`) :

| # | Label | Route | Icone |
|---|---|---|---|
| 12 | Users | `/dashboard/admin/users` | Users |
| 13 | Agents | `/dashboard/admin/agents` | Bot |
| 14 | LLM Gateway | `/dashboard/admin/gateway` | Network |
| 15 | Logs | `/dashboard/admin/logs` | ScrollText |
| 16 | Monitoring | `/dashboard/admin/monitoring` | Activity |
| 17 | Settings | `/dashboard/admin/settings` | Settings |

**Elements du sidebar** :
- Logo (symbol only quand collapsed)
- Avatar user (initiale dans un carre)
- Display name (tronque quand collapsed)
- Email (cache quand collapsed)
- Badge role (Admin/User)
- Bouton Logout
- Bouton Collapse/Expand (chevron)

**Plan-gating** : `<PlanGate requiredPlan="pro">` wrapper sur les pages CVE, Skills, Tools, Cloud, AD.
Le hook `usePlan()` fetch `/api/billing/plan` et retourne le plan actuel.

---

## 1. Overview (`/dashboard`)

**Fichier** : `app/[locale]/dashboard/page.tsx`

### Widgets et metriques

**Stats cards (grille de 4)** :
| Card | Donnee | Source |
|---|---|---|
| Scans | Nombre de scans du mois | `GET /api/engagements?limit=10` |
| Critiques detectes | Findings critical | `GET /api/dashboard/stats` |
| Haute severite | Findings high | `GET /api/dashboard/stats` |
| Temps moyen | Duree moyenne des audits | `GET /api/dashboard/stats` |

**Section Admin (si platform_admin)** :
- 4 cards supplementaires : Users total, Scans ce mois, Findings total, Revenue
- Service health badges (indicateurs de connexion)
- Derniers audit logs (5 derniers) : `GET /api/admin/settings/audit-logs?limit=5`

**BJHUNT AI Status Panel** :
- Latence AI
- Token quota : X.XM / YM avec barre de pourcentage
- Engagement usage : X / Y avec barre de progression coloree

**Usage Charts** :
- Scans/jour (barres, labels : L, M, M, J, V, S, D)
- Repartition severites (barres horizontales : CRITIQUE, HAUTE, MOYENNE, FAIBLE)

**Subscription/Plan** :
- Plan actuel avec usage bars
- Compteur engagements restants
- Compteur tokens restants

**Recent Scans Table** :
- Colonnes : Target, Status (icones : ✓/⟳/◷/✗), Result, Duration
- Source : `GET /api/engagements?limit=10`

### Boutons et interactions

| Bouton | Action | Condition |
|---|---|---|
| "Nouveau scan →" | Navigate vers `/dashboard/chat` | Toujours |
| "Passer a Pro →" | Navigate vers `/pricing` | Plan free uniquement |
| "Voir tous →" | Navigate vers `/dashboard/admin/logs` | Admin uniquement |

### API calls

| Methode | Endpoint | But |
|---|---|---|
| GET | `/api/auth/me` | Auth check (server-side) |
| GET | `/api/health/ready` | Status des services |
| GET | `/api/engagements?limit=10` | Scans recents |
| GET | `/api/dashboard/stats` | Metriques |
| GET | `/api/billing/plan` | Plan actuel |
| GET | `/api/billing/usage` | Usage du mois |
| GET | `/api/admin/users?limit=1` | Nombre users (admin) |
| GET | `/api/admin/settings/audit-logs?limit=5` | Logs recents (admin) |
| GET | `/api/admin/settings/stats` | Stats admin |

---

## 2. Chat AI (`/dashboard/chat`) — PAGE CENTRALE

**Fichier** : `app/[locale]/dashboard/chat/page.tsx` (1667 lignes, `use client`)
**C'est la page la plus complexe du frontend. 25+ variables de state, streaming SSE, gestion multi-agent.**

### Architecture de streaming (SP3 two-phase)

```
Phase 1 — Prepare (REST)
  POST /api/proxy/chat/prepare
  Body: { message, engagementId, agentGraph, conversationId?, attachmentIds? }
  Response: { streamUrl, ticket, conversationId }

Phase 2 — Stream (SSE direct, bypass Vercel)
  GET ${streamUrl}?ticket=${ticket}&_t=${Date.now()}
  Protocol: text/event-stream via fetch() + ReadableStream
  Auth: ticket param (pas de header, evite CORS preflight)
  Cache-bust: _t param (contourne le cache 24h Chrome CORS)
```

### State variables (25+)

```typescript
// Engagement & Conversation
engagements, activeEngagement, activeConversationId, sidebarConversations

// Messages & Display
messages: ChatMessage[], toolCalls: Map<string, ToolCall>,
subAgents: Map<string, SubAgentSession>, objectives: Objective[],
graphNodes: GraphNode[], graphEdges: GraphEdge[], graphStats: GraphStats

// Streaming
thinking: { content, active }, isStreaming, streamError,
tokenCount, streamSpeed

// UI Panels
showSidebar, sidebarTab ("conversations"|"opplan"|"graph"),
showSettings, showPromptLibrary, selectedAgent, webSearch,
modelSettings, activeAgent

// Sidebar interactions
conversationSearch, contextMenu, renamingId, renameValue, deleteConfirmId
```

### Refs (protection race conditions)

```typescript
abortRef           // AbortController pour le bouton Stop
requestIdRef       // Guard contre les race conditions (switch conversation mid-stream)
lastAiContentRef   // Contenu cumule du message AI
hasAutoNamedRef    // Auto-naming de l'engagement apres premiere reponse
streamStartTimeRef // Pour calcul de vitesse
tokensSoFarRef     // Compteur tokens pendant le stream
speedIntervalRef   // Interval 500ms pour le calcul de vitesse
speedSamplesRef    // Moving average 5 echantillons
```

### SSE Event Types traites

| Event | Donnees | Action frontend |
|---|---|---|
| `token` | `{ token, agent }` | Append au message, update speed (~4 chars/token) |
| `tool_call` | `{ id, name, args, status }` | Ajoute dans Map toolCalls, status="running" |
| `tool_result` | `{ id, result/output, status, duration }` | Update Map toolCalls, status="completed"/"error" |
| `thinking` | `{ content, active }` | Affiche bloc pensee collapsible |
| `subagent_start` | `{ id, name, description }` | Ajoute dans Map subAgents |
| `subagent_end` | `{ id }` | Update status subAgent |
| `objective` | Objective data | Push dans objectives[] |
| `graph_update` | `{ nodes, edges, stats }` | Update graphNodes/graphEdges/graphStats |
| `values` | LangGraph message state | Parse AIMessage, extract token usage |
| `custom` | LangGraph custom events | Route vers subagent lifecycle |
| `error` | `{ message }` | Banner rouge + bouton Retry |
| `done` | `{ tokensIn, tokensOut }` | Fin du stream, cleanup |

### Composants du Chat

#### ChatInput (`components/chat/chat-input.tsx`, 339 lignes)

**Props** :
```typescript
{
  onSubmit: (content: string, files: PendingFile[]) => void
  onStop: () => void
  onOpenSettings: () => void
  onOpenPromptLibrary: () => void
  onSlashCommand?: (context: SlashCommandContext) => void
  webSearch: boolean
  onToggleWebSearch: () => void
  disabled?: boolean
  isStreaming?: boolean
  selectedAgent?: string
  onSelectAgent?: (agentId: string) => void
}
```

**Elements** :
- Textarea (auto-sizing jusqu'a 40vh)
- Zone file upload (drag-drop, preview images)
- Enregistreur vocal (Speech Recognition API, `fr-FR`)
- Dropdown selection agent
- Toggle web search
- Bouton prompt library
- Bouton model settings
- Bouton Send (ou Stop pendant le streaming)
- Menu slash commands (apparait quand on tape `/`)

**Raccourcis clavier** :
- `Enter` → Envoyer
- `Shift+Enter` → Nouvelle ligne
- `Escape` → Fermer les panneaux
- `/` → Menu slash commands
- Fleches → Naviguer le menu slash

#### AgentSelector (`components/chat/agent-selector.tsx`, 358 lignes)

**17 agents organises par categorie** :

| Categorie | Agents |
|---|---|
| **Orchestration** | `bjhunt` (defaut), `soundwave` |
| **Offensive** | `recon`, `exploit`, `postexploit`, `ad_operator`, `cloud_hunter` |
| **Analysis** | `analyst`, `reverser`, `contract_auditor` |
| **VulnResearch** | `vulnresearch`, `scanner`, `detector`, `verifier`, `patcher`, `exploiter` |
| **Defense** | `defender` |

Dropdown avec dots colores par categorie, search-friendly.

#### MessageBubble (`components/chat/message-bubble.tsx`, 385 lignes)

**Rendu** :
- Label role ("Vous" ou "BJHUNT AI" avec dot couleur provider)
- Preview fichiers uploades
- Contenu markdown (ReactMarkdown + rehype-highlight pour syntax highlighting)
- Blocs code inline avec boutons "Copy" et "Run"
- Animation curseur terminal pendant le streaming
- Barre d'actions (apres fin du streaming) :
  - Copy, Text-to-speech, Regenerate, Fork
  - Token estimate (~1 token / 4 chars)
- Sources web (citations numerotees)

**Empty response handling** :
- Warning : "Le moteur IA est temporairement indisponible"
- Bouton Retry

#### ToolCallBlock (`components/chat/tool-call-block.tsx`, 160 lignes)

| Status | Indicateur | Couleur |
|---|---|---|
| running | Spinner | Orange |
| completed | Checkmark vert | Vert |
| error | X rouge | Rouge |
| pending | — | — |

Expandable : Input (commande/args JSON), Output (result/error), Duration.

#### ThinkingBlock (`components/chat/thinking-block.tsx`, 85 lignes)

- Active : Spinner avec animation bouncing dots
- Complete : Collapsible avec texte complet de la reflexion

#### SubAgentCard (`components/chat/sub-agent-card.tsx`, 124 lignes)

- Nom agent avec couleur par categorie
- Status (spinner/checkmark/X), duree, nombre de tool calls
- ToolCallBlocks imbriques
- Messages assistant (premiers 500 chars)

#### SlashCommandsMenu (`components/chat/slash-commands.tsx`, 235 lignes)

| Commande | Description |
|---|---|
| `/help` | Afficher toutes les commandes |
| `/clear` | Vider les messages du chat |
| `/export` | Telecharger la conversation en Markdown |
| `/agents` | Lister les agents disponibles |
| `/model` | Afficher/changer le modele AI |
| `/status` | Statut de l'engagement |
| `/findings` | Resume des findings |
| `/scan` | Lancer un scan de securite |
| `/report` | Generer un rapport de vulnerabilites |
| `/search` | Chercher dans la base CVE |
| `/terminal` | Mode terminal interactif |

#### ModelSettingsPanel (`components/chat/model-settings-panel.tsx`, 125 lignes)

| Setting | Type | Range |
|---|---|---|
| System prompt | Textarea | Libre |
| Temperature | Range slider | 0-2, step 0.05 |
| Max tokens | Range slider | 256-8192, step 256 |
| Top P | Range slider | 0-1, step 0.05 |
| Stream response | Toggle | boolean |
| Web search | Toggle | boolean |

#### PromptLibraryPanel (`components/chat/prompt-library-panel.tsx`, 211 lignes)

**Categories** : Pentest (4), Code (4), Analysis (3), Redaction (3), General (3)
**Custom prompts** : stockes dans `localStorage: bjhunt:prompt-library-custom`
Click injecte le prompt dans l'input. Auto-fermeture apres selection.

#### OpplanPanel (`components/chat/opplan-panel.tsx`, 175 lignes)

**Phases MITRE ATT&CK Kill Chain** : reconnaissance, initial_access, execution, persistence, privilege_escalation, defense_evasion, credential_access, discovery, lateral_movement, collection, exfiltration, impact

**Status par objectif** : Pending (cercle vide), Active (spinner), Completed (check vert), Failed (X rouge)
Barre de progression : Completed/Total

#### KnowledgeGraphPanel (`components/chat/knowledge-graph-panel.tsx`, 216 lignes)

**Onglets** :
1. **Overview** — Stats grid (Nodes, Edges, Critical, High) + repartition par type de node
2. **Nodes** — Liste expandable avec proprietes, badges de severite
3. **Edges** — Relationships (source → [relationship] → target)

**Types de nodes** : host, service, vulnerability, credential, domain, network, finding

### Sidebar Chat

**3 onglets** :
1. **Conversations** — Recherche, groupage par date (Aujourd'hui, Hier, 7 derniers jours, Plus ancien), context menu (Rename, Delete)
2. **OPPLAN** — Objectifs operationnels, kill chain
3. **Graph** — Knowledge graph Neo4j

**Context menu** (clic droit) :
- Rename → edition inline, persist via `PATCH /api/engagements/{id}`
- Delete → confirmation modale, `DELETE /api/engagements/{id}`

**Auto-naming** : Apres la premiere reponse AI, l'engagement est auto-nomme avec les 40 premiers chars du message user.

### Suggested prompts (page vide)

| Prompt | Icone |
|---|---|
| "Scan my web application for vulnerabilities" | Globe |
| "Audit my AWS infrastructure" | Cloud |
| "Analyze this code for security issues" | Code |
| "Find attack paths in my Active Directory" | Database |

### API calls du Chat

| Methode | Endpoint | But |
|---|---|---|
| GET | `/api/engagements` | Charger les engagements |
| POST | `/api/engagements` | Creer un engagement `{ name, target, agentGraph }` |
| PATCH | `/api/engagements/{id}` | Rename |
| DELETE | `/api/engagements/{id}` | Supprimer |
| GET | `/api/chat/conversations?limit=50` | Liste conversations sidebar |
| GET | `/api/chat/history/{engagementId}` | Historique des conversations |
| GET | `/api/chat/conversations/{convId}/messages` | Messages d'une conversation |
| DELETE | `/api/chat/conversations/{convId}` | Supprimer une conversation |
| POST | `/api/chat/files` | Upload fichier (FormData) → `{ id }` |
| POST | `/api/proxy/chat/prepare` | Phase 1 : obtenir streamUrl + ticket |
| GET | `${streamUrl}?ticket=...&_t=...` | Phase 2 : stream SSE direct |

---

## 3. Findings (`/dashboard/findings`)

**Fichier** : `app/[locale]/dashboard/findings/page.tsx`

### Stats bar (6 badges)
TOTAL (gris), CRITICAL (rouge), HIGH (orange), MEDIUM (orange), LOW (vert), INFO (bleu)
Source : `GET /api/findings/stats`

### Filtres

| Filtre | Type | Options |
|---|---|---|
| Severity | Dropdown | All, CRITICAL, HIGH, MEDIUM, LOW, INFO |
| Engagement | Dropdown | Charge depuis `/api/engagements?limit=100` |
| Search | Input texte | Recherche libre + bouton Search |

### Table des findings

| Colonne | Donnee | Interaction |
|---|---|---|
| Checkbox | Selection | Select individuel ou tous |
| Chevron | Expand | Deploie les details |
| Severity | Badge colore | — |
| Title + MITRE tags | Texte + badges | — |
| CVE | ID CVE | — |
| CVSS | Score numerique | Colore par seuil |
| Remediation | Status (pending/applied/verified) | Badge colore |
| Engagement | Nom de l'engagement | — |
| Date | Timestamp | — |

**Details deployes** :
- Description, Evidence/PoC (JSON formate), Remediation
- MITRE ATT&CK techniques (liste complete)
- CVE IDs, CVSS Vector, Metadata
- Lien "View in Graph" → `/dashboard/audits/{engagementId}/graph`

### Boutons

| Bouton | Condition | Action |
|---|---|---|
| Search | Toujours | Applique les filtres |
| Export Selected | Quand selections | `POST /api/findings/export` avec `{ ids: string[] }` |
| Clear | Quand selections | Deselectionner tout |
| Prev / Next | Pagination | Navigation (50/page) |

---

## 4. CVE Intelligence (`/dashboard/cve`)

**Plan requis** : `pro` (via `<PlanGate requiredPlan="pro">`)

### Modes de recherche
- **By CVE** : Recherche par ID CVE
- **By Package** : Recherche par nom de package + version

### Etat initial (pas de recherche)
"Trending Critical CVEs" — grille 2x2 avec cards :
- CVE ID, Severity badge, CVSS score, Description (2 lignes), EPSS bar + pourcentage
- Source : `GET /api/cve/trending`

### Resultats de recherche
Cards CVE expandables avec :
- CVSS 3.1 score + vector, EPSS score avec barre de probabilite
- Description complete, Produits affectes (badges)
- References (liens externes), Dates
- **Boutons** : "Copy CVE ID" (clipboard), "Create Exploit Objective" (placeholder, pas implemente)

### API calls

| Methode | Endpoint | But |
|---|---|---|
| GET | `/api/cve/trending` | CVEs critiques du moment |
| GET | `/api/cve/search?q=...` | Recherche par CVE ID |
| GET | `/api/cve/search?package=...&version=...` | Recherche par package |

---

## 5. Skills Catalog (`/dashboard/skills`)

**Plan requis** : `pro`

### Sidebar categories (46 categories)

Categories principales : Recon (5 sous-cat), Exploit (2), Post-Exploit (5), Analyst (11), AD, Cloud, Smart Contracts, Reverse Engineering, Scanner, Detector, Verifier, Patcher, Exploiter, VulnResearch, Shared, Soundwave, Decepticon

### Skill cards
- Nom (bold, monospace), Category badge (colore), MITRE techniques (max 4, +N)
- Difficulty (easy/medium/hard, dot colore + label), Time estimate
- Description preview (2 lignes, cache quand deploye)

### Detail deploye
- Description complete, Tools, Subcategory, Tags (badges)
- MITRE ATT&CK (liste complete), Content markdown (scrollable, max-height 400px)
- Charge a la demande via `GET /api/skills/${category}/${name}`

---

## 6. Tools Playground (`/dashboard/tools`)

**Plan requis** : `enterprise`

### 6 outils

| Onglet | Input | Type | Shortcut |
|---|---|---|---|
| **Bash** | Commande shell | Textarea | Ctrl+Enter |
| **KG Query** | Requete Cypher | Textarea | Ctrl+Enter |
| **CVE Lookup** | CVE ID | Input | Enter |
| **JWT Parse** | Token JWT | Textarea | Enter |
| **IAM Audit** | Policy AWS JSON | Textarea (8 rows) | Enter |
| **Network Scan** | Cible nmap | Input | Enter |

**Output** :
- Status (vert ✓ / rouge ✗), Duration en ms, Timestamp
- Bouton Copy, Output scrollable avec bordure coloree
- JSON pretty-print (2-space indent), plain text fallback

**Historique** : 20 dernieres executions, clickable pour recharger

**API** : `POST /api/tools/execute` avec `{ tool, input: { [inputKey]: value } }`

---

## 7. Cloud Assessment (`/dashboard/cloud`)

**Plan requis** : `enterprise`

### Selection du provider (4 options)

| Provider | Surfaces d'attaque |
|---|---|
| AWS | IAM privesc, S3 takeover, EC2 metadata, credential scope |
| Azure | RBAC audit, storage account, managed identity |
| GCP | IAM policy, GCS bucket, metadata instance |
| K8s | RBAC output, pod security spec, exposed secrets |

### Champs par provider

**AWS** : IAM Policy JSON (textarea 6 rows), S3 Bucket Name (input), EC2 Metadata Target (input), Credential Scope (textarea 3 rows)

**Azure** : RBAC Role Assignments JSON (textarea 6 rows), Storage Account Name (input), Check Managed Identity Exposure (checkbox)

**GCP** : GCP IAM Policy JSON (textarea 6 rows), GCS Bucket Name (input), Metadata Instance (input)

**K8s** : RBAC Output (textarea 6 rows), Pod Security Spec YAML (textarea 6 rows), Scan for Exposed Secrets (checkbox)

### Lancement et resultats

- Config summary : Agent (Cloud Hunter), Provider selectionne
- "Start Cloud Scan" (desactive si pas de provider ou en cours)
- Polling toutes les 5s : `GET /api/engagements/{id}` + `GET /api/engagements/{id}/findings`
- Resultats : severity badges, findings expandables avec remediation

### API calls

| Methode | Endpoint | But |
|---|---|---|
| POST | `/api/engagements` | Creer le scan cloud |
| POST | `/api/engagements/{id}/launch` | Lancer le scan |
| GET | `/api/engagements/{id}` | Polling status |
| GET | `/api/engagements/{id}/findings` | Polling findings |

---

## 8. Active Directory Assessment (`/dashboard/ad`)

**Plan requis** : `enterprise`

### Upload BloodHound
- Drag-and-drop (accepte .zip, .json) ou file input
- Summary apres upload : Users, Groups, Computers, Domain Trusts, Paths to DA
- Bouton Remove (parsing mock, pas de backend reel)

### 7 techniques d'attaque (grille)

| Technique | MITRE | Risque | Defaut |
|---|---|---|---|
| Kerberoasting | T1558.003 | HIGH | Active |
| AS-REP Roasting | T1558.004 | HIGH | Active |
| ADCS ESC1-ESC15 | T1649 | CRITICAL | Active |
| DCSync | T1003.006 | CRITICAL | Desactive |
| Golden Ticket | T1558.001 | CRITICAL | Desactive |
| Pass-the-Hash | T1550.002 | HIGH | Desactive |
| BloodHound Path | — | HIGH | Active |

### Configuration cible

| Champ | Type | Requis | Placeholder |
|---|---|---|---|
| Domain Name | Input | Oui (*) | `corp.example.com` |
| DC IP/Hostname | Input | Non | `dc01.corp.example.com or 10.0.0.10` |
| Username | Input | Non | `CORP\username or user@corp.example.com` |
| Password | Password | Non | `Password or NTLM hash` |
| Scan Scope | 2 boutons | Non | Full Domain / Specific OUs |
| Specific OUs | Textarea (3 rows, conditionnel) | Non | Exemple avec format OU=... |

### Resultats
- Status badge (running/completed/failed)
- Severity summary badges
- Attack Chains (display horizontal avec fleches entre steps)
- Findings expandables avec remediation

---

## 9. Settings (`/dashboard/settings`)

**Fichier** : `app/[locale]/dashboard/settings/page.tsx`

### 4 sections

| Section | Composant | Fonctionnalites |
|---|---|---|
| **Account** | — | Email (readonly), Display Name form, Change Password form |
| **Display Name** | `DisplayNameForm` | Input + bouton Save |
| **Password** | `ChangePasswordForm` | Current password, New password, bouton Update |
| **API Keys** | `ApiKeysPanel` | Generate, Revoke, voir les cles |
| **2FA** | `TwoFactorPanel` | Enable/Disable TOTP, backup codes |

### API calls inferees

| Methode | Endpoint | But |
|---|---|---|
| GET | `/api/auth/me` | User actuel |
| POST | `/api/auth/change-password` | Changer mot de passe |
| PATCH | `/api/auth/display-name` | Mettre a jour le nom |
| POST | `/api/keys` | Generer API key |
| DELETE | `/api/keys/{id}` | Revoquer API key |
| POST | `/api/auth/2fa/setup` | Setup TOTP |
| POST | `/api/auth/2fa/enable` | Activer 2FA |
| POST | `/api/auth/2fa/disable` | Desactiver 2FA |

---

## 10. Guide (`/dashboard/guide`)

**Page statique** (aucun appel API).

7 sections :
1. Premiers pas (Getting started)
2. Les agents (table 17 agents : nom, role, description)
3. Findings et rapports (formats d'export)
4. OPPLAN et Vaccine Loop (cycle Attack-Defense-Verify-Repeat)
5. Outils avances (6 outils listes)
6. Plans et limites (table comparatif Free/Pro/Enterprise)
7. API Enterprise (exemple curl, payload webhook)

---

## 11. Audits/Scans (`/dashboard/audits`)

**Fichier** : `app/[locale]/dashboard/audits/page.tsx` + `audits-client.tsx`

- Server-side fetch : `GET /api/engagements?limit=20`
- Client component pour filtrage/pagination
- Table d'engagements avec status, findings count, duree

---

## Inventaire complet des boutons (100+)

### CTA principaux
1. "Nouveau scan →" (Dashboard home)
2. "Passer a Pro →" (Dashboard, plan free)
3. "Start Cloud Scan" (Cloud)
4. "Start AD Scan" (AD)
5. "Execute" (Tools)
6. "Search" (Findings, CVE, Skills)

### Controles de formulaire
7-13. Prev/Next (pagination), Cancel/Delete (confirmations), Rename (context menu), Remove (BloodHound), Submit (forms)

### Toggles et selections
14-17. Provider selector (4x Cloud)
18-19. Scope selector (2x AD)
20-21. Search mode (2x CVE)
22-27. Tool tabs (6x Tools)
28-30. Sidebar tabs (3x Chat)
31-37. Technique checkboxes (7x AD)
38-39. Finding checkboxes (individuel + master)

### Actions
40. Copy CVE ID
41. Copy (Tools output)
42. Export Selected (Findings)
43. New conversation (Chat)
44-45. Sidebar toggle, Settings toggle, Prompt library toggle (Chat)
46. Web search toggle (Chat)
47. Stop / Retry (Chat streaming)
48. Scroll to bottom FAB (Chat)
49. Logout (Sidebar)
50. Collapse/Expand sidebar

### Champs de formulaire (52+)
Tous les champs documentes ci-dessus dans chaque section.

---

## Fonctionnalites non implementees / placeholders

| Feature | Statut | Emplacement |
|---|---|---|
| "Create Exploit Objective" (CVE) | Bouton existe, pas de backend | CVE Intel |
| Model settings persistence | UI existe, changements non persistes | Chat settings |
| Prompt library creation | Read-only actuellement | Chat prompt library |
| BloodHound file parsing | Mock, pas de parsing reel | AD Assessment |
| Message editing | Prop `onEdit` existe, pas wire au backend | Chat messages |
| Message feedback (up/down) | Prop `onFeedback` existe, pas wire | Chat messages |
| Message forking | Prop `onFork` existe, pas wire | Chat messages |
| Code "Run" button | Bouton existe, pas fonctionnel | Chat code blocks |
| Regenerate | Partiellement implemente | Chat messages |

---

## Dependances backend critiques

Chaque page du dashboard depend de routes API backend. Voici la matrice :

| Page | Routes backend requises | Decepticon requis ? |
|---|---|---|
| Overview | `/api/engagements`, `/api/dashboard/stats`, `/api/billing/*`, `/api/health/ready` | Non |
| Chat | `/api/engagements/*`, `/api/chat/*`, streaming SSE | **Oui** (LangGraph) |
| Findings | `/api/findings/*`, `/api/engagements` | Non (lecture DB) |
| CVE Intel | `/api/cve/*` | Non (NVD/EPSS APIs) |
| Skills | `/api/skills/*` | **Oui** (lecture SKILL.md) |
| Tools | `/api/tools/execute` | **Oui** (sandbox Kali) |
| Cloud | `/api/engagements/*` | **Oui** (Cloud Hunter agent) |
| AD | `/api/engagements/*` | **Oui** (AD Operator agent) |
| Settings | `/api/auth/*`, `/api/keys/*` | Non |
| Guide | Aucun (statique) | Non |
| Audits | `/api/engagements` | Non (lecture DB) |
