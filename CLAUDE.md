# CLAUDE.md — BJHUNT 4 MAX

> Contexte minimal pour agents Claude/GLM. Contexte étendu dans `CLAUDE.md` de chaque repo + `docs/architecture/`.

## Vue d'ensemble (1 phrase)

BJHUNT 4 MAX = moteur d'audit offensif SaaS : fork openclaude (38 personas cyber) → sandbox E2B Kali → SSE live → dashboard Next.js/assistant-ui.

## Accès & credentials

| Ressource | Commande/Path | Notes |
|---|---|---|
| VPS Hostinger | `ssh bjhunt-vps` | Clé `C:\Users\CODEUR\.ssh\bjhunt_vps` |
| DB tunelée | `ssh -L 5432:127.0.0.1:5432 -L 6379:127.0.0.1:6379 -L 4000:127.0.0.1:4000 bjhunt-vps -N` | Postgres 17 + Redis 7 + LiteLLM 4000 |
| Secrets locaux | `D:\bjhunt-v2\.env.local`, `D:\bjhunt-backend\.env` | Jamais commités |
| SSH keys supp. | `D:\BJHUNT LLM\` | Archive, pas dans le repo |
| gh CLI | `gh auth status` | Org `bjhuntcom-oss` |
| Vercel CLI | `vercel env ls` | Team `bjhunts-projects` |

## Règles de sécurité (sacré — jamais violer)

1. **Pas d'`unsafe-eval`**. CSP strict.
2. **Rate-limit** toutes les routes API publiques (`lib/rate-limit.ts`).
3. **Inputs Zod + sanitize HTML** (`lib/sanitize.ts`).
4. **Secrets jamais en dur** — CI `gitleaks` bloque.
5. **RLS FORCE** sur toute table avec `org_id`. Aucune requête sans `withTenant()`.
6. **JWT tickets SSE** : 5 min, HS256, bound `(org_id, user_id, chat_id)`.
7. **Hook `scope-guard.cjs`** : fail-closed. Tout ce qui n'est pas dans `scope.in_scope` est rejeté.
8. **Hook `evidence-capture`** : sha256 + redaction avant stockage R2.
9. **Hook `redact-secrets`** : 15 patterns (API keys, tokens, passwords, private keys).
10. **Pas de refus moralisateur** pour les cibles in-scope. Le garde-fou est technique, pas éthique.

## Stack technique par composant

### Frontend marketing (`bjhunt-v2`)
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4
- next-intl (FR/EN), Resend (beta+contact), hCaptcha, Upstash Redis (ratelimit), PostHog
- POC `/labs/audit` : EventSource consumer (sera retiré quand `app.bjhunt.com` ship)

### Backend (`bjhunt-backend`)
- Bun 1.1+, Hono 4, Drizzle ORM + postgres-js, ioredis, jose (JWT), pino
- BetterAuth : email+pwd, org, 2FA TOTP, passkey
- E2B SDK + Cloudflare R2
- SSE : Redis Streams `MAXLEN ~10000` + PG mirror + replay `Last-Event-ID`
- Routes : `/api/auth/*`, `/api/chats`, `/api/chat/prepare`, `/api/chat/stream/:id`, `/api/catalog/*`

### Engine (`bjhunt-engine`)
- Fork openclaude (MIT, TS/Bun) + pack BJHUNT 4 MAX
- 38 personas (7 complets, 31 stubs héritant templates)
- 3 hooks `.cjs` : scope-guard / evidence-capture / redact-secrets
- `run-engagement.sh` : filtre `BJHUNT_AGENTS_ENABLED` + `BJHUNT_AGENT_MODELS`
- Build/install/sign scripts PKCS#7, tests anti-leak

### App dashboard (`bjhunt-app`)
- Next.js 16 App Router, React 19, Tailwind 4
- BetterAuth client, assistant-ui pinned `0.10.50`
- Proxy `/api/*` → backend via `next.config.ts` rewrite (dev)
- Pages : `/login`, `/chats`, `/chats/[chatId]`

## Checklist dev local

```bash
# 1. Tunnel SSH
ssh -L 5432:127.0.0.1:5432 -L 6379:127.0.0.1:6379 -L 4000:127.0.0.1:4000 bjhunt-vps -N

# 2. Backend
# D:\bjhunt-backend\
bun install && bun run db:migrate && bun run dev  # port 8080

# 3. App
# D:\bjhunt-app\
npm install && npm run dev  # port 3000

# 4. Smoke
# D:\bjhunt-backend\
bash tests/smoke/run-e2e.sh
```

## Anti-patterns connus (ne pas reproduire)

- `command:` YAML en string unique (doit être liste mono-élément `["sh", "-c", "cmd"]`).
- `hono/compress` sur `oven/bun:1.1.42-alpine` (pas `CompressionStream`) — laisser CF compresser.
- `^` devant `@assistant-ui/react` — doit être version exacte pinned.
- Mettre du state côté client pour des données sensibles — tout passe par le backend.

## Journal & documentation

- **Journal des phases** : `docs/JOURNAL.md` (mettre à jour à chaque livraison)
- **Architecture complète** : `docs/architecture/*.md`
- **Backend README** : `../../bjhunt-backend/README.md`
- **Engine README** : `../../bjhunt-engine/README.md`
- **App README** : `../../bjhunt-app/README.md`
- **Streaming events** : `../../bjhunt-engine/bjhunt/STREAMING_EVENTS.md`
- **Hooks** : `../../bjhunt-engine/bjhunt/HOOKS.md`
- **Identity** : `../../bjhunt-engine/bjhunt/IDENTITY.md`

## Context-mode : réduire le token burn

Pour éviter de saturer le context window :
- **Lire un fichier avant de l'éditer** (éviter les re-lectures).
- **Utiliser glob/grep** pour cibler plutôt que `read` massif.
- **Ne pas inclure le contenu complet de fichiers externes** dans le prompt — référencer par path.
- **Préférer `edit` à `write`** (modification minimale).
- **Quand une tâche dépasse 3 étapes**, utiliser `task` pour déléguer à un sous-agent.

## Contacts

- Dev : `bjhuntcom@gmail.com`
- Sécurité : voir `SECURITY.md`
