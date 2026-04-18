# 08 — Dashboard Admin

> Audit exhaustif des pages admin. Chaque bouton, chaque endpoint, chaque table.
> Source : `app/[locale]/dashboard/admin/`, `backend/src/routes/admin/`

## Controle d'acces

**Layout** : `app/[locale]/(dashboard)/admin/layout.tsx`
- Requiert cookie header valide
- Appelle `GET /api/auth/me` pour verifier l'utilisateur
- Verifie `user.role === 'platform_admin'`
- Redirects vers `/dashboard` si pas admin, `/login` si pas authentifie

**Backend middleware** : `backend/src/middleware/auth.ts`
- `requireAuth` — verifie l'authentification
- `requireAdmin` — verifie `user.isPlatformAdmin === true`
- Retourne 403 "Admin access required" si non autorise
- Rate limiting applique sur toutes les routes admin

---

## 1. Users (`/dashboard/admin/users`)

**Fichier** : `app/[locale]/dashboard/admin/users/page.tsx`

### Stats cards (grille de 4)

| Card | Donnee | Calcul |
|---|---|---|
| Total | Nombre total d'utilisateurs | `total` du endpoint |
| Actifs | Users avec role !== 'viewer' | Filtre cote serveur |
| Bloques | Users avec role === 'viewer' ou status === 'suspended' | Filtre |
| Admins | Users platform_admin | Comptage `isPlatformAdmin` |

### Table utilisateurs

| Colonne | Donnee | Notes |
|---|---|---|
| EMAIL | email + displayName | Clickable pour expand |
| ROLE | platform_admin → "Admin" / member → "User" | Badge colore |
| STATUT | Bloque / En ligne / Actif | Indicateur couleur |
| DERNIERE ACTIVITE | Derniere connexion (format fr-FR) | "—" si jamais connecte |
| SESSIONS | Compteur + manager | Panel expandable |
| ACTIONS | Block/Revoke/Delete | Boutons contextuels |

### SessionsPanel (`users/sessions-panel.tsx`)

| Element | Action |
|---|---|
| `[Sessions ▼/▲]` | Expand/collapse la liste des sessions |
| Liste sessions | Date creation + date expiration pour chaque |
| `[Revoquer toutes les sessions]` | Rouge, avec confirmation modale |
| "Chargement..." | Pendant le fetch |
| "Aucune session active." | Si vide |

### UserActionsPanel (`users/user-actions-panel.tsx`)

| Bouton | Couleur | Action | Backend |
|---|---|---|---|
| `[Revoquer sessions]` | Gris | Revoquer toutes les sessions | `POST /api/admin/users/{id}/revoke-sessions` |
| `[Bloquer]` | Jaune | Desactiver le compte | `PATCH /api/admin/users/{id}` `{ role: 'viewer' }` |
| `[Debloquer]` | Vert | Reactiver le compte | `PATCH /api/admin/users/{id}` `{ role: 'member' }` |
| `[Supprimer]` | Gris → Rouge `[Confirmer] [Annuler]` | Supprimer l'utilisateur | `DELETE /api/admin/users/{id}` |

**Feedback** :
- "X session(s) revoquee(s)" en vert apres revocation
- Message d'erreur en rouge si l'action echoue
- Auto-dismiss apres 8 secondes

### API endpoints Users

| Methode | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/api/admin/users` | query: limit, offset, search | `{ users: [], total }` |
| POST | `/api/admin/users` | `{ email, password, displayName?, role?, orgId? }` | `{ user }` |
| GET | `/api/admin/users/{id}` | — | `{ user }` (sans password_hash) |
| PATCH | `/api/admin/users/{id}` | `{ role?, isPlatformAdmin? }` | `{ user }` |
| GET | `/api/admin/users/{id}/sessions` | — | `{ sessions: [] }` |
| POST | `/api/admin/users/{id}/revoke-sessions` | — | `{ ok, revokedSessions: count }` |
| DELETE | `/api/admin/users/{id}` | — | `{ ok: true }` |

Toutes les mutations loguees dans `audit_logs` avec action `admin.user.*`

---

## 2. Agents (`/dashboard/admin/agents`)

**Fichier** : `app/[locale]/dashboard/admin/agents/page.tsx` + `agents-client.tsx`

### Liste des profils agents

Grille avec pour chaque profil :
- **Nom** (bold mono)
- **Description** (subtext)
- **Badges** : "ACTIF" (vert) / "DEFAUT" (gris)
- **Date** : "Modifie le [date]"

### Structure d'un profil agent

```typescript
{
  id: string
  name: string                    // 1-200 chars
  description: string | null      // 0-1000 chars
  soul_md: string                 // 0-50000 chars — Personnalite & directives
  agents_md: string               // 0-50000 chars — Agents disponibles & capacites
  identity_name: string | null    // 0-100 chars
  identity_emoji: string | null   // 0-10 chars
  visible_to_users: boolean
  is_active: boolean
  is_default: boolean
  updated_at: ISO string
}
```

### Boutons par profil

| Bouton | Condition | Action |
|---|---|---|
| `[+ Nouveau profil]` | Toujours | Ouvre le formulaire CREATE en haut |
| `[⚡ Activer]` | Si pas actif | Active ce profil (desactive les autres) |
| `[✓ Actif]` | Si actif | Affiche le statut, desactive |
| `[✎]` | Toujours | Ouvre le formulaire EDIT |
| `[🗑]` | Si pas actif ET pas default | DELETE avec confirmation |

### Formulaire Create/Edit

| Champ | Type | Validation |
|---|---|---|
| Nom | Input text | min 1 char, requis |
| Description | Input text | max 1000 chars |
| Nom identite | Input text | max 100 chars |
| Emoji | Input text | max 10 chars |
| SOUL.md | Textarea (8 rows) | max 50000 chars |
| AGENTS.md | Textarea (8 rows) | max 50000 chars |
| Visible aux utilisateurs | Checkbox | boolean |

**Actions formulaire** :
- `[Sauvegarder]` → POST ou PATCH selon isNew
- `[Annuler]` → Ferme le formulaire
- Loading : "Sauvegarde..." pendant l'operation
- Erreur : banner rouge en haut si echec

**Erreurs protegees** :
- "Cannot delete the active profile" (400)
- "Cannot delete the default profile" (400)

### API endpoints Agents

| Methode | Endpoint | But |
|---|---|---|
| GET | `/api/admin/agents` | Liste resumee des profils |
| GET | `/api/admin/agents/{id}` | Profil complet (avec SOUL/AGENTS md) |
| POST | `/api/admin/agents` | Creer un profil |
| PATCH | `/api/admin/agents/{id}` | Mettre a jour |
| DELETE | `/api/admin/agents/{id}` | Supprimer (echoue si actif/default) |
| POST | `/api/admin/agents/{id}/activate` | Activer (desactive les autres) |

---

## 3. LLM Gateway (`/dashboard/admin/gateway`)

**Fichier** : `app/[locale]/dashboard/admin/gateway/page.tsx` + sous-composants

### 3A — Default Model Selector

- `<select>` listant tous les modeles de tous les providers
- Format : `{providerId}/{modelId}`
- On change : `PATCH /api/admin/gateway/defaults` avec `{ model: string }`

### 3B — Providers List

Chaque ligne de provider :

| Champ | Contenu |
|---|---|
| ID | Bold mono |
| Status | "actif" (badge vert) / "desactive" (badge rouge) |
| Type | "ollama" (badge si applicable) |
| Base URL | Mono tronque |
| Models | "X modele(s)" |
| Test | "✓ OK XXms" ou "✗ Error message" |

**Boutons par provider** :

| Bouton | Icone | Action |
|---|---|---|
| `[⚡]` | Zap | Test connectivite → `POST /api/admin/gateway/providers/{id}/test` |
| `[✎]` | Edit | Navigate vers `/dashboard/admin/gateway/{id}` |
| `[🗑]` | Trash | DELETE provider |
| `[+ Ajouter]` | Plus | Navigate vers `/dashboard/admin/gateway/new` |

### 3C — Formulaire Provider (edit/create)

**Route** : `/dashboard/admin/gateway/{providerId}` ou `/dashboard/admin/gateway/new`

**Section Provider** :

| Champ | Type | Notes |
|---|---|---|
| ID du provider | Text | Desactive si edition |
| Nom d'affichage | Text | Display name |
| Base URL | URL | API endpoint |
| API Key | Password/text | Toggle `[Reveler]` / `[Masquer]` |
| Protocole Ollama | Checkbox | Pour APIs Ollama-compatible |
| Active | Checkbox | Enable/disable |

**Section Models** (table avec `[+ Ajouter un modele]`) :

| Champ | Type | Validation |
|---|---|---|
| ID | Text | 1-200 chars |
| Nom | Text | 1-200 chars |
| Context window | Number | min 1 |
| Max tokens | Number | min 1 |
| Reasoning | Checkbox | boolean |
| Input types | Checkboxes | text, image, file |
| Cost (in/out/cacheRead/cacheWrite) | Numbers | Defaults implicites |
| `[🗑]` | — | Supprimer le modele |

**Actions** :
- `[Sauvegarder]` → `POST /api/admin/gateway/providers/{id}`
- `[Tester la connexion]` → `POST /api/admin/gateway/providers/{id}/test`
- Statuts : "✓ Sauvegarde", "✗ Error", "✓ OK XXms"

### 3D — Ollama Models (`ollama-models.tsx`)

**Liste des modeles installes** :
- Nom, Taille (Go/Mo), Date de modification, bouton Delete (avec confirmation)

**Installation de modeles** :
- Input : placeholder "ex: llama3.2:3b"
- Bouton `[⬇ Installer]` / `[Telechargement...]`
- **Log de progression en temps reel** : SSE stream depuis `POST /api/admin/ollama/models/pull`, max 20 lignes, scrollable

### API endpoints Gateway

| Methode | Endpoint | But |
|---|---|---|
| GET | `/api/admin/gateway/providers` | Config complete `{ providers, defaults, ui }` |
| POST | `/api/admin/gateway/providers/{id}` | Create/update provider |
| GET | `/api/admin/gateway/providers/{id}` | Get provider config |
| DELETE | `/api/admin/gateway/providers/{id}` | Delete provider |
| POST | `/api/admin/gateway/providers/{id}/test` | Test `{ ok, latencyMs?, error? }` |
| PATCH | `/api/admin/gateway/defaults` | Set default model |
| GET | `/api/admin/ollama/models` | List Ollama models |
| DELETE | `/api/admin/ollama/models/{name}` | Delete model |
| POST | `/api/admin/ollama/models/pull` | Download (SSE stream) |

---

## 4. Audit Logs (`/dashboard/admin/logs`)

**Fichier** : `app/[locale]/dashboard/admin/logs/page.tsx` + `audit-logs-viewer.tsx`

### Filtres

| Filtre | Type | Options |
|---|---|---|
| Utilisateur | Dropdown | Tous les users (fetch `/api/admin/users`) |
| Action | Input texte | Libre (ex: "login") |
| Type | Input texte | Resource type (ex: "user") |
| Depuis | Date picker | From date |
| Jusqu'a | Date picker | To date |

**Boutons** :
- `[Filtrer]` — Applique les filtres, reset page 1
- `[Export CSV]` — Download des logs en CSV
- Affiche "X resultat(s)"

### Table des logs

| Colonne | Donnee |
|---|---|
| DATE | Datetime ISO format fr-FR |
| UTILISATEUR | Email ou ID |
| ACTION | Type d'action |
| TYPE | Resource type |
| RESOURCE | Resource ID |

**Row click** → Deploie le payload JSON en dessous

### Pagination
- "Page X / Y"
- `[← Precedent]` / `[Suivant →]`
- Limite : 50 logs par page

### Categories d'events loggues

| Categorie | Events |
|---|---|
| Auth | LOGIN, LOGOUT, REGISTER, PASSWORD_RESET, PASSWORD_CHANGE |
| Audit | START, STOP, PAUSE, RESUME, COMPLETE, FAIL |
| Admin | ROLE_CHANGE, USER_SUSPEND, USER_DELETE, SETTINGS_CHANGE |
| API | API_KEY_CREATE, API_KEY_DELETE, API_KEY_ROTATE |
| System | BACKUP, CLEANUP, QUOTA_RESET, PROVIDER_FAIL, HEALTH_ALERT |
| Billing | PLAN_UPGRADE, PLAN_DOWNGRADE, PAYMENT_SUCCESS, PAYMENT_FAIL |
| Agent | admin.agent.create, admin.agent.update, admin.agent.delete, admin.agent.activate |
| User mgmt | admin.user.create, admin.user.update, admin.user.delete, admin.user.revoke_sessions |

### API

`GET /api/admin/settings/audit-logs?limit=50&offset={offset}&userId={id}&action={action}&resourceType={type}&from={date}&to={date}`

---

## 5. Monitoring (`/dashboard/admin/monitoring`)

**Fichier** : `app/[locale]/dashboard/admin/monitoring/page.tsx` + `monitoring-dashboard.tsx`

### Queue stats (4 cards)

| Card | Couleur | Donnee |
|---|---|---|
| Total | Gris | Nombre total de runs |
| En cours | Ambre | Runs actifs |
| Termines | Vert | Runs completes |
| Echoues | Rouge | Runs en erreur |

### Service Health

**Badge global** :
- "OPERATIONNEL" (fond vert) si `health.ready === true`
- "DEGRADE" (fond rouge) si `health.ready === false`

**Grille des services** (2-3 colonnes) :

| Service | Status | Indicateur |
|---|---|---|
| PostgreSQL | Connected/Down | `● PostgreSQL OK` / `● PostgreSQL KO` |
| Redis | Connected/Down | Idem |
| SearXNG | Connected/Down | Idem |
| Stockage | Connected/Down | Idem |
| Gateway | Connected/Down | Idem |

### Controles

- `[↻ Rafraichir]` — Refresh manuel (desactive pendant pending)
- "Mis a jour : [HH:MM:SS]" — Timestamp derniere maj
- **Auto-refresh toutes les 10 secondes**

### API

| Methode | Endpoint | But |
|---|---|---|
| GET | `/api/admin/settings/agent-runs` | Stats queue `{ total, running, completed, failed, pending, tokens }` |
| GET | `/api/health/ready` | Health checks services |

---

## 6. Platform Settings (`/dashboard/admin/settings`)

**Fichier** : `app/[locale]/dashboard/admin/settings/page.tsx` + `platform-settings-form.tsx`

### Section Identite (editable)

| Champ | Type | Defaut |
|---|---|---|
| Nom de la plateforme | Input text | "BJHUNT" |
| Description de la plateforme | Input text | "" |

`[Sauvegarder]` → `PUT /api/admin/settings` pour chaque cle
Statuts : "✓ Sauvegarde" / "✗ Erreur"

### Section Securite (affichage seul)

| Setting | Valeur |
|---|---|
| Duree de session | 30 jours |
| Mot de passe minimum | 14 caracteres |
| Hachage | Argon2id |
| 2FA (TOTP) | Optionnel |
| CSP | strict-dynamic nonce |

### Section Email (affichage seul)

| Setting | Valeur |
|---|---|
| Provider | Resend |
| Statut | Configure |
| Domaine expediteur | bjhunt.com |
| Templates | Reset password, Welcome, Beta invite |

### Section Infrastructure (affichage seul)

| Setting | Valeur |
|---|---|
| VPS | Hostinger KVM 8 — 8 vCPU, 32 GB RAM |
| IP | 82.25.117.79 |
| OS | Ubuntu 25.10 |
| Reverse proxy | Caddy + sslh (443) |
| Services Docker | 8 (caddy, backend, langgraph, pg, redis, neo4j, sandbox, litellm) |
| Frontend | Vercel (bjhunt.com) |
| Disque | 400 GB (7% utilise) |
| Expiration VPS | 25 janvier 2027 |

### API

| Methode | Endpoint | But |
|---|---|---|
| GET | `/api/admin/settings` | Get all settings |
| PUT | `/api/admin/settings` | Update setting (key/value) |

---

## Tables DB referencees par l'admin

| Table | Contenu |
|---|---|
| `users` | id, email, password_hash, display_name, role, is_platform_admin |
| `sessions` | id, user_id, created_at, expires_at |
| `agent_profiles` | id, name, soul_md, agents_md, identity_*, is_active, is_default |
| `gateway_providers` | id, name, provider_type, api_key_encrypted, api_base, enabled, models, config |
| `platform_settings` | key, value, updated_at |
| `audit_logs` | user_id, action, resource, details, created_at |
| `agent_runs` | status, tokens_input, tokens_output |

---

## Matrice de permissions (verifiee dans le code)

| Feature | user | admin (platform_admin) |
|---|---|---|
| Dashboard user | ✅ | ✅ |
| Dashboard admin | ❌ (redirect) | ✅ |
| View all users | ❌ | ✅ |
| Block/Unblock users | ❌ | ✅ |
| Delete users | ❌ | ✅ |
| Manage agent profiles | ❌ | ✅ |
| Configure LLM providers | ❌ | ✅ |
| View audit logs | ❌ | ✅ |
| View monitoring | ❌ | ✅ |
| Edit platform settings | ❌ | ✅ |
| Revoke user sessions | ❌ | ✅ |

Note : Le code actuel n'a que 2 niveaux de role (`member` et `platform_admin`), pas 3 (`user`, `admin`, `super_admin`) comme prevu dans l'architecture cible. Le role `super_admin` reste a implementer.
