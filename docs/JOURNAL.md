# JOURNAL DE BORD — BJHUNT

> Journal chronologique des actions, décisions et résultats. Mis à jour au fur et à mesure.

---

## 2026-04-29 (Day 1) — Reset, planification, setup plateformes

### Phase 0 — Cleanup total (matin) ✅

**Actions** :
- Audit complet de la codebase legacy (backend Hono+Bun + engine Decepticon 17 agents Python LangGraph + dashboard Next.js)
- Audit complet du VPS Hostinger via SSH (12 containers Docker, 11 volumes, crons)
- Décision de purge totale + rebuild from scratch (dette technique > rebuild)
- Purge backend + engine + ops + docker-compose (suppression dossiers)
- Purge VPS Hostinger : 0 container, 0 volume, 0 cron — disque 34GB → 2.9GB
- Migration SSH keys via Hostinger panel (Playwright MCP) : ancienne clé `bjhunt-vps-admin` supprimée, nouvelle `bjhunt-vps-2026-04-29` ed25519 créée et synchronisée
- Archive engine dans repo privé `bjhuntcom-oss/bjhunt-legacy-engine` (266 commits préservés via `git subtree split`)
- Vercel envs nettoyées (suppression `NEXT_PUBLIC_API_URL`)
- GitHub CI simplifié : `ci.yml` lint+build+gitleaks frontend uniquement
- Nettoyage repo : `package.json` réduit (-192 packages), 12 composants UI inutiles supprimés, namespaces i18n trimmés (1238→284 lignes), pages dashboard/login/auth supprimées
- 192 packages npm enlevés, repo passe de monorepo à frontend-only

**Résultats** :
- Repo `bjhuntcom-oss/bjhunt` propre, frontend-only
- Site `bjhunt.com` toujours live sur Vercel (marketing pages + formulaires beta/contact)
- Backend Hono+Bun et engine Python entièrement supprimés
- 0 container Docker, VPS dispo pour rebuild

### Audit unbiased openclaude + warpdotdev/warp (midi) ✅

**Démarche** : recherche A→Z neutre via 3 forks parallèles d'agents pour valider la décision rebuild.

**Audit openclaude (Gitlawb/openclaude)** :
- Licence MIT, TypeScript ~99%, 25k★, 523 commits, mainteneur très actif
- Support Opus 4.7 mergé J0 (2026-04-29)
- 45 tools built-in : Bash, Read/Write/Edit, Glob, Grep, Agent, Task*, MCP, WebFetch, etc.
- gRPC streaming bidirectionnel (mappable 1:1 sur SSE)
- Multi-LLM routing natif via `agentRouting` (compatible LiteLLM)
- Sub-agents : `LocalAgentTask` + `RemoteAgentTask` cadre prêt
- **Verdict** : excellente base, à wrapper côté SaaS (auth + RLS + sandbox + SSE + DB tous à ajouter)

**Audit warpdotdev/warp** :
- Rust ~98% desktop natif, AGPL v3 sur 80% du repo (uniquement crate `warpui`/`warpui_core` MIT)
- AGPL v3 = empoisonnement réseau interdit en SaaS proprio
- Rust desktop incompatible avec Next.js TypeScript web
- **Verdict** : écarté entièrement (incompatible techniquement et juridiquement)

**Décision finale** : Backend = fork openclaude (TS/Bun/MIT). Pas d'utilisation Warp (ni code, ni inspiration patterns dans les docs).

**Documentation produite** : 11 ADRs dans `docs/architecture/10-DECISIONS.md`, 9 docs design (00-VISION → 11-ROADMAP).

### Phasing DBs Hostinger → Hetzner (après-midi) ✅

**Décision affinée** : réutiliser le VPS Hostinger KVM 8 déjà acheté (`82.25.117.79`, 8 vCPU / 32 GB / 400 GB NVMe, EU Lithuania) pour Phase 1-2 au lieu de payer Hetzner CCX43 immédiatement.

**Économie** : ~€100/mo Hetzner pendant 4-6 mois. Migration Hetzner Falkenstein DE déclenchée Phase 3+ uniquement si prospect enterprise EU exige souveraineté DE pure.

**Effort migration future** : ~1 jour (`pg_dump` + DNS swap wireguard).

### Phase 1.1 — Setup credentials plateformes ✅

#### E2B (sandbox Kali per-engagement)
- Compte créé : org `bjhuntcom` (email `bjhuntcom@gmail.com`)
- API key créée : `bjhunt-backend` (sans expiration)
- Stockée dans `.env.local` (gitignored)

#### Fly.io (backend Hono+Bun)
- Compte créé : org `bjhunt-com` (free trial actif)
- Token créé : `bjhunt-backend-deploy` (org-scoped, expire 2027-04-29)
- Note : tokens user-scoped bloqués (org SSO requirement) → token org obligatoire
- Stocké dans `.env.local`

#### Cloudflare (DNS + WAF + R2)
- Compte existant : `bjhuntcom@gmail.com` (account_id `b3ebcff77cd46cfc669fa6cbb9b25b52`)
- API token User créé : `bjhunt-backend` (R2:Edit account-wide + DNS:Edit zone scope)
- R2 subscription activée (gratuit 10GB/mois, $0 dû)
- 4 buckets R2 créés (EEUR region, jurisdiction default) :
  - `bjhunt-reports` (rapports PDF générés)
  - `bjhunt-evidence` (screenshots, dumps réseau)
  - `bjhunt-backups` (Postgres dumps)
  - `bjhunt-assets` (assets statiques)
- Account API token R2 créé : `bjhunt-backend-r2` (Object Read & Write, all buckets, Forever)
- S3-compatible credentials :
  - `R2_ACCESS_KEY_ID` (32 chars hex)
  - `R2_SECRET_ACCESS_KEY` (64 chars hex)
  - Endpoint default : `b3ebcff77cd46cfc669fa6cbb9b25b52.r2.cloudflarestorage.com`
  - Endpoint EU : `b3ebcff77cd46cfc669fa6cbb9b25b52.eu.r2.cloudflarestorage.com`

### Migration NS bjhunt.com : Vercel → Cloudflare ✅

**Découverte** : `bjhunt.com` était sur NS Vercel (`ns1/ns2.vercel-dns.com`), registrar Name.com (revente Vercel).

**Actions** :
1. Ajout du site bjhunt.com en zone Cloudflare (plan Free)
2. Scan auto Cloudflare → 18 DNS records importés (apex A, www A, wildcard, MX ImprovMX, TXT SPF/DKIM Resend, AmazonSES, CAA, etc.)
3. Suppression de 2 records pointant vers VPS purgé :
   - `api.bjhunt.com` → 82.25.117.79 ❌ (deleted)
   - `chat.bjhunt.com` → 82.25.117.79 ❌ (deleted)
4. Switch NS sur Vercel : `ns1.vercel-dns.com` + `ns2.vercel-dns.com` → `marge.ns.cloudflare.com` + `odin.ns.cloudflare.com`
5. Vérification propagation : Cloudflare zone status `active`, WHOIS Google DNS confirme nouveaux NS

**Zone ID Cloudflare** : `429cb50d872530ffadfb2deb7acd5461`

**Test smoke** : `curl https://bjhunt.com` → 429 Vercel Challenge Token (anti-bot pour curl, normal — site OK depuis browser).

**Notes** :
- Records Vercel `chat`/`hok`/`whunt` restent dans la table Vercel mais sont maintenant **inertes** (Vercel ne contrôle plus le DNS). Cosmétique.
- Cloudflare proxy actif sur les A records (orange-cloud) → WAF + Turnstile + cache Cloudflare désormais devant Vercel CDN.

### Phase 1.4 — Fork openclaude → bjhunt-engine privé ✅

**Approche** : fork privé via mirror push (un fork standard `gh repo fork` resterait public car parent public).

**Actions** :
1. `gh repo create bjhuntcom-oss/bjhunt-engine --private` (repo vide créé)
2. `git clone --bare https://github.com/Gitlawb/openclaude.git /tmp/openclaude-mirror`
3. `git push --mirror https://github.com/bjhuntcom-oss/bjhunt-engine.git` (toutes branches + tags poussés)
4. Cleanup mirror temporaire
5. `git clone https://github.com/bjhuntcom-oss/bjhunt-engine.git D:\bjhunt-engine\` (working copy locale, hors `bjhunt-v2`)

**Repo bjhunt-engine** :
- Visibilité : **privée** (confirmé via `gh repo view`)
- Branches : `main` + 8 feature branches (cleanup-inline-source-maps, feat/auto-fix-service, feat/codebase-intelligence-repo-map, feat/issue-454-openclaude-config-dir, fix/363-startup-input-freeze, fix/383-bash-tool-args, fix/386-windows-clipboard-encoding, fix/3p-provider-compat-consolidated)
- Tags : 10 tags (v0.2.1 → v0.7.0)
- Commits : 523
- Taille : 44 MB
- Stack confirmée : Bun + TypeScript (`bun.lock`, `package.json`, src/, bin/, docs/, scripts/, python/)

**Working copy locale** : `D:\bjhunt-engine\` (à côté de `D:\bjhunt-v2\`)

### Phase 1.2 — Provisionner Hostinger VPS (Coolify + Postgres + Redis + LiteLLM) ✅

#### Coolify v4 (orchestrator UI)
- Installation officielle : `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
- Containers : `coolify`, `coolify-db` (Postgres), `coolify-redis`, `coolify-realtime` (tous healthy)
- URL : `http://82.25.117.79:8000` (HTTP plain port pour l'instant — TLS via Caddy ou Cloudflare Tunnel à venir)
- Credentials root :
  - User : `bjhunt-admin`
  - Email : `bjhuntcom@gmail.com`
  - Password : stocké dans `.env.local`
- Backup `.env` Coolify : `/tmp/coolify-env-backup.txt` (local + serveur `/data/coolify/source/.env`)

#### Stack `bjhunt` (direct docker-compose)
**Décision** : provisionner Postgres/Redis/LiteLLM directement via `docker compose` dans `/data/bjhunt-stack/` (bootstrap plus rapide que Coolify UI ; import dans Coolify pour management futur). Ports liés à **127.0.0.1 uniquement** sur le VPS — accès depuis Fly.io via wireguard mesh (Phase 2). Pour le dev local : tunnels SSH (`ssh -L 5432:127.0.0.1:5432 bjhunt-vps`).

**Fichiers créés sur VPS** :
- `/data/bjhunt-stack/docker-compose.yml` (3 services + 1 réseau bridge `bjhunt-net`)
- `/data/bjhunt-stack/litellm/config.yaml` (config minimale, modèles ajoutés au fur et à mesure)
- `/data/bjhunt-stack/.env` (chmod 600, contient les passwords)

**Postgres 17 + pgvector 0.8.2** :
- Image : `pgvector/pgvector:pg17`
- Container : `bjhunt-postgres`
- Port : `127.0.0.1:5432`
- DB : `bjhunt` · User : `bjhunt` · Encoding : UTF8 / Locale : C
- Extension `vector` installée et vérifiée (`SELECT extname, extversion FROM pg_extension`)
- Volume persistant : `bjhunt_bjhunt-postgres-data`
- Healthcheck : `pg_isready` toutes les 10s
- Status : **healthy**

**Redis 7-alpine** :
- Container : `bjhunt-redis`
- Port : `127.0.0.1:6379`
- Auth : `requirepass` activé (password fort, dans `.env.local`)
- Persistence : AOF (`appendonly yes`)
- Eviction : `maxmemory 2gb` + `allkeys-lru`
- Volume persistant : `bjhunt_bjhunt-redis-data`
- Healthcheck : `redis-cli PING` toutes les 10s
- Status : **healthy** (PONG vérifié)

**LiteLLM proxy 1.82.3** :
- Image : `ghcr.io/berriai/litellm:main-stable`
- Container : `bjhunt-litellm`
- Port : `127.0.0.1:4000`
- Backend DB : Postgres `bjhunt` (table proxy modèles, `STORE_MODEL_IN_DB=true`)
- Cache : Redis (succès/échec callbacks vides pour l'instant)
- Master key : stockée dans `.env.local`
- 2 workers, timeout 600s, retries 2
- Healthcheck : `GET /health/liveliness` (port interne 4000)
- Status : **healthy** — `/health/readiness` confirme `db:connected, cache:redis`
- `model_list` vide pour l'instant — Ollama Cloud (GLM-5.1, DeepSeek, Kimi) à brancher plus tard

#### Sécurité réseau
- UFW : 22/80/443 uniquement ouverts publiquement
- Coolify port 8000 : exposé publiquement (Docker bypass UFW iptables — known issue)
  - À sécuriser Phase 2 via Caddy/TLS ou Cloudflare Tunnel
- bjhunt-stack ports : `127.0.0.1` only (pas exposés depuis l'extérieur)

#### Credentials .env.local ajoutées
- `POSTGRES_URL`, `POSTGRES_PASSWORD`
- `REDIS_URL`, `REDIS_PASSWORD`
- `LITELLM_URL`, `LITELLM_MASTER_KEY`
- `COOLIFY_*`

### Mise à jour docs

Toutes les docs `docs/architecture/*.md` mises à jour pour refléter :
- Phasing Hostinger Phase 1-2 / Hetzner Phase 3+
- Drop entier de Warp (juste mention "écarté" dans ADR-002 alternatives)
- Retrait des caveats DMCA openclaude (user a tranché : pas de risque réel à mentionner)

3 commits Git poussés sur `main` :
- `docs: write final architecture (decisions arrêtées)`
- `docs: drop Warp + retirer caveats DMCA openclaude`
- `docs: phasing DBs Hostinger (Phase 1-2) → Hetzner (Phase 3+)`

---

## Récapitulatif état actuel

### Comptes & credentials (tous dans `.env.local`)
- ✅ E2B : org `bjhuntcom`, API key active
- ✅ Fly.io : org `bjhunt-com`, deploy token actif (expire 2027)
- ✅ Cloudflare : account `b3ebcff77cd46cfc669fa6cbb9b25b52`, API token + R2 access keys
- ✅ Hostinger : VPS `82.25.117.79` purgé et dispo (SSH alias `bjhunt-vps`)

### Domaines & DNS
- ✅ bjhunt.com migré sur Cloudflare (zone `429cb50d...`)
- ✅ NS propagés (marge + odin .ns.cloudflare.com)
- ✅ R2 buckets prêts pour rapports/backups/evidence/assets
- ⏳ NS migration full propagation 24-48h (déjà visible Google DNS)

### Repos GitHub
- ✅ `bjhuntcom-oss/bjhunt` (public) — frontend Next.js
- ✅ `bjhuntcom-oss/bjhunt-legacy-engine` (privé) — archive Decepticon
- ✅ `bjhuntcom-oss/bjhunt-engine` (privé) — fork openclaude (créé via mirror push)

### Phase 1.3 — Brancher Ollama Cloud sur LiteLLM ✅

**Endpoint** : `https://ollama.com/v1` (OpenAI-compatible, vérifié via curl direct)
**Auth** : `Authorization: Bearer <OLLAMA_CLOUD_API_KEY>` (clé dans `.env.local` + VPS `/data/bjhunt-stack/.env`)

**Modèles déclarés dans `litellm/config.yaml`** (provider `openai/` avec `api_base` Ollama) :
- `glm-5.1` (Zhipu AI — défaut pour reasoning + français)
- `deepseek-v3.2`
- `kimi-k2-thinking`
- `qwen3-coder` (qwen3-coder:480b)

**Tests end-to-end via LiteLLM proxy** :
- `GET /v1/models` → 4 modèles listés ✅
- `POST /v1/chat/completions` model=`glm-5.1` → réponse correcte (`"4"` à `2+2 ?`), 149 tokens total ✅

**Note** : `drop_params: true` côté LiteLLM gère les paramètres non-supportés. `glm-5.1` génère beaucoup de tokens de "thinking" interne — prévoir `max_tokens` >= 256 pour avoir une réponse visible.

### Phase 1.4 — Pack BJHUNT V2.1 (personas + reporting + Typst) ✅

**Branche** : `feat/bjhunt-v2.1-pack` sur `bjhuntcom-oss/bjhunt-engine` (privé).
PR draft URL : https://github.com/bjhuntcom-oss/bjhunt-engine/pull/new/feat/bjhunt-v2.1-pack

**Recherche web** : Claude Code 2026 features (subagents `--agents` JSON
frontmatter, skills `.claude/skills/`, hooks 25 lifecycle points dont
`PreToolUse`/`PostToolUse`/`UserPromptSubmit` avec `duration_ms`,
`hookSpecificOutput.updatedToolOutput`). Pattern Dream openclaude consolidé
en mémoire narrative cross-session via `services/autoDream/` — adopté pour
BJHUNT V2.1 en mode "Dream Diary par engagement".

**Fork engine inventaire** :
- 6 built-in agents openclaude : Explore, GeneralPurpose, Plan, ClaudeCodeGuide,
  StatuslineSetup, Verification
- 45+ tools (Bash, FileRead/Write/Edit, Glob, Grep, AgentTool, Task*, MCP,
  WebFetch, WebSearch, Skill, Hooks, etc.)
- Loader markdown frontmatter `loadAgentsDir.ts` (charge `.claude/agents/*.md`)
- `src/commands/dream/dream.ts` + `services/autoDream/` (mémoire narrative
  cross-session)

**Pack BJHUNT V2.1 livré** dans `bjhunt-engine/bjhunt/` :

| Fichier | Description |
|---|---|
| `README.md` | Index pack + mécanique build |
| `IDENTITY.md` | System prompt master — identité BJHUNT V2.1 (jamais Claude/GPT/Ollama), autorisation présumée acquise via engagement signé, posture ultra-offensif/curieux/parano, conversationnel hors action, refus moralisateurs interdits |
| `AGENTS_INVENTORY.md` | Catalogue 38 agents (1 coordinator + 23 offensifs/support + 14 reporting compliance) avec model/color/maxTurns + schéma orchestration ASCII |
| `STREAMING_EVENTS.md` | 12 events SSE typés (run.started, agent.started/thinking/tool_call/tool_result/finding/progress/handoff/completed, evidence.captured, dream.diary_entry, run.completed) + erreurs (scope_violation, runtime) + persistence Postgres mirror + resume via Last-Event-ID |
| `HOOKS.md` | 3 hooks critiques : `PreToolUse:scope-guard` (bloque hors-scope, fail-closed), `PostToolUse:evidence-capture` (sha256+chiffrement R2 SSE-C+chain-of-custody), `UserPromptSubmit:redact-secrets` (SecretRegistry+regex), + `OnInterval:dream-diary-entry` |
| `DREAM_DIARY.md` | Adaptation pattern Dream openclaude → narratif client par engagement, annexe rapport executive |
| `CHECKLIST_OUBLIS.md` | 50+ points anti-oublis : mandate signé, watermark, signature PKCS#7, chain-of-custody, sandbox-per-engagement, kill-switch global+client, quotas LLM, rate-limit, egress filtering, retest auto post-fix, diff initial vs retest, multi-langue, RGPD right to erasure, RBAC granulaire, JWT short-lived, OpenTelemetry, Sentry, audit log immuable, replay, backups, status page, RLS strict, 2FA, multi-tenant tests CI, adversarial prompts tests, fuzz scope-guard, etc. |
| `personas/_TEMPLATE_offensive.md` | Template offensif |
| `personas/_TEMPLATE_reporting.md` | Template reporting |

**38 personas (`personas/*.md`) — frontmatter YAML compatible loader openclaude** :

5 personas complets (system prompt détaillé) :
- `coordinator` (lead red-team, orchestre tout)
- `recon-osint` (OSINT externe : sublist3r/amass/crt.sh/leaked-creds)
- `web-pentester` (OWASP Top 10 / ASVS, chaining, JWT, SSTI, SSRF...)
- `ad-internal` (BloodHound, Kerberoast, ADCS ESC1-15, NTLM relay, DCSync)
- `report-pci-dss-v4` (rapport PCI-DSS v4.0 complet avec sections détaillées)

33 personas stubs fonctionnels (frontmatter complet + role + tools + playbook concis) :
- Offensifs/support : recon-web, network-scanner, api-pentester, auth-pentester,
  cloud-aws/gcp/azure, kubernetes-pentester, mobile-android/ios, wireless,
  social-engineering, exploit-dev, post-exploit, password-cracker,
  forensics-passive, vuln-researcher, evidence-collector, risk-scorer,
  dream-keeper
- Reporting (1 par compliance) : iso-27001-2022, soc2, nist-csf-2,
  nist-800-53, owasp-asvs-5, owasp-top10, hipaa, gdpr, nis2, dora,
  cis-benchmarks, mitre-attck, executive

**15 templates Typst (`compliance-templates/*.typ`)** :
- `_common.typ` : utilitaires partagés (couleurs BJHUNT, fonts Inter+JetBrains
  Mono, severity-badge, cover-page, finding-card, compliance-matrix,
  watermark rotated 60pt rouge alpha)
- `pci-dss-v4.typ` : template PCI-DSS v4.0 **complet** (cover, ToC, exec
  summary auto-généré depuis findings.json, methodology 12 reqs, scope, CDE,
  matrice conformité, findings par sévérité, TRA items, remediation roadmap
  J+30/Q+1/1an, evidence index, glossaire, attestation)
- 13 templates compliance scaffolded : iso-27001-2022, soc2, nist-csf-2,
  nist-800-53r5, owasp-asvs-5, owasp-top10-2024, hipaa, gdpr, nis2, dora,
  cis-benchmarks, mitre-attck, executive-summary
- `diary-annex.typ` : template littéraire pour le Dream Diary (layout
  aéré, justification, indent first-line, fonts plus chaleureuses)

**Choix techniques** :
- **Pas de wrappers TS pour nmap/nuclei/sqlmap** — tout passe par `Bash`
  dans la sandbox E2B Kali (Firecracker per-engagement). Le toolkit Kali
  natif suffit + simplifie maintenance.
- **Format markdown frontmatter YAML** (pas JSON inline) — chargé par
  `loadAgentsDir.ts` natif d'openclaude.
- **Identité hardcodée dans IDENTITY.md** + à injecter en tête du system
  prompt par modification ciblée de `src/constants/prompts.ts` (Phase 1.5).
- **Rendu PDF via Typst** vs LaTeX/WeasyPrint — choisi pour : déterminisme,
  syntaxe simple, rendu pixel-perfect, pas de dépendances LaTeX.
- **PKCS#7 detached signature + RFC 3161 timestamp** sur tous les PDF via
  `bjhunt/scripts/sign-pdf.sh` (à coder Phase 1.5).

### Phase 1.5 — Runtime layer BJHUNT V2.1 (hooks + identity + signing) ✅

**PR draft** : https://github.com/bjhuntcom-oss/bjhunt-engine/pull/1
(commit `60e31c0` sur `feat/bjhunt-v2.1-pack`).

#### Injection identité (`src/constants/bjhuntIdentity.ts` + patch `prompts.ts`)
- `getBjhuntIdentitySection()` — retourne le body identité condensé si
  `BJHUNT_MODE=true`, sinon `null`
- Patch chirurgical sur `getSimpleIntroSection()` : si BJHUNT_MODE → identité
  BJHUNT V2.1 prend la place du "You are an interactive agent that helps
  users with software engineering tasks" upstream
- Anti-leak : enumération explicite des marques interdites (Claude, Anthropic,
  OpenClaude, GPT, GLM, DeepSeek, Kimi, Ollama)
- Off par défaut → openclaude se comporte exactement comme upstream sans
  modification visible

#### 3 hooks `.cjs` standalone Node (`bjhunt/hooks/*`)
- **scope-guard.cjs** (PreToolUse, fail-closed) :
  - Parse URLs/IPs/CIDRs/hosts/fs paths depuis le tool input
  - Cross-check `engagement.scope.in_scope` vs `out_of_scope` (CIDR contain,
    wildcard *.host, URL prefix)
  - Vérifie `expires_at`
  - Bloque via `hookSpecificOutput.permissionDecision: "deny"`
  - Émet `error.scope_violation` SSE side channel
  - Fail-closed sur parse error / engagement absent
- **evidence-capture.cjs** (PostToolUse, matcher `Bash|PowerShell|WebFetch`) :
  - sha256 de la sortie + redactions (Authorization Bearer/Basic, JWT,
    Set-Cookie, AWS AKID, Slack, JSON secrets, PEM private keys)
  - Match aussi les `BJHUNT_SECRET_VALUES` du SecretRegistry (sub par
    placeholder `{{REDACTED:SECRET_<id>}}`)
  - Ledger append-only JSONL avec dedup sha256 (32 dernières lignes)
  - Cap à 10 MB par evidence
  - Émet `evidence.captured` SSE
- **redact-secrets.cjs** (UserPromptSubmit) :
  - 15+ patterns détectés : AWS AKID, AWS secret, GCP private key, JWT,
    Slack token, GitHub PAT/OAuth, Cloudflare token, Fly.io token, E2B
    token, OpenAI key, Anthropic key, Stripe key, PEM private, Basic auth,
    Bearer
  - Surface un `additionalContext` redaction note (le LLM est notifié que
    des secrets ont été redactés, sans qu'il les voie)
  - Append au transcript redaction log

#### Settings + scripts
- `bjhunt/settings.template.json` : wires les 3 hooks dans `.claude/settings.json`
  avec timeouts (5s scope-guard / 10s evidence / 3s redact)
- `bjhunt/scripts/build-claude-agents.sh` : copie `personas/*.md` →
  `.claude/agents/`, render template settings.json (sub `${BJHUNT_HOME}`),
  drop `bjhunt.env` source-able
- `bjhunt/scripts/install-bjhunt-mode.sh` : bootstrap sandbox E2B avec
  verifications (hooks parse, agents core présents)
- `bjhunt/scripts/sign-pdf.sh` : signature PKCS#7 detached + timestamp
  RFC 3161. 3 modes :
  - **embedded** (pyHanko) : signature visible Acrobat
  - **detached** (openssl + curl freetsa.org) : `.p7s` + `.tsr` à côté du PDF
  - **stub** : warning + skip si `BJHUNT_SIGNING_CERT/KEY` absent (dev/staging)

#### Tests anti-leak
- `src/constants/__tests__/bjhuntIdentity.test.ts` (Bun test) :
  - BJHUNT_MODE off par défaut, helpers retournent null
  - BJHUNT_MODE=true|1 active la section
  - Body identité : claims "BJHUNT V2.1", négations explicites de chaque
    marque interdite, refus moralisateurs interdits, autorisation présumée
    acquise, vocabulaire SSE complet, posture ultra-offensif/curieux/parano
- À exécuter en CI via `bun test`

### Phase 1.8 — Backend Hono+Bun (squelette + RLS + SSE) ✅

**Repo** : `bjhuntcom-oss/bjhunt-backend` (privé, créé 2026-04-29).
**Working copy** : `D:\bjhunt-backend\`.
**Stack** : Bun 1.1+ · Hono 4 · Drizzle ORM (postgres-js) · ioredis · jose
JWT · zod · ulid · @aws-sdk/client-s3 (R2).

#### Squelette projet
- `package.json` (scripts dev/start/build/test/typecheck/db:migrate/db:seed/db:studio)
- `tsconfig.json` (strict, noUncheckedIndexedAccess, ESNext, Bun types)
- `Dockerfile` multi-stage `oven/bun:1.1.42-alpine` (deps → build typecheck →
  runtime tini + curl healthcheck)
- `fly.toml` (org bjhunt-com, primary `cdg`, fallback `ams`, 2 machines min,
  `auto_stop_machines=off` pour SSE long-lived, healthcheck `/api/health`,
  metrics port 9091)
- `drizzle.config.ts`, `.env.example`, `.gitignore`, `README.md`

#### Schéma Postgres (`migrations/0001_init.sql`) — multi-tenant strict
- 9 tables : `orgs`, `users`, `org_members`, `engagements`, `runs`,
  `findings`, `evidence`, `stream_events`, `audit_log`
- **RLS FORCE** sur chaque table tenant-scopée (engagements, runs, findings,
  evidence, stream_events, audit_log, org_members + orgs self-scope)
- Helper functions `app_current_org()` / `app_current_user()` lisent les GUCs
  `app.org_id` / `app.user_id` (set par middleware tenant)
- **Append-only** triggers sur `evidence` (immutabilité chain-of-custody) et
  `audit_log` (immutabilité audit trail)
- Rôle `bjhunt_app` NOINHERIT créé pour exécution avec RLS active
- Extensions : `pgcrypto`, `pgvector`, `pg_trgm` (déjà installées sur VPS)

#### Lib core
- `lib/db.ts` — postgres-js pool (max 20) + Drizzle + `withTenant(orgId,
  userId, fn)` qui wrap chaque transaction avec `SELECT set_config('app.org_id', ...)`
- `lib/redis.ts` — ioredis singleton, helpers `streamKey(org, run)`,
  `ticketKey(jti)`
- `lib/jwt.ts` — HS256 SSE tickets, **TTL hard cap 300s**, audience
  `bjhunt-sse`, scope `sse`, ULID jti
- `lib/sse.ts` — `writeEvent()` (XADD MAXLEN ~10000 + mirror Postgres) +
  `streamEventsToResponse()` (replay PG si Last-Event-ID, puis tail Redis
  XREAD BLOCK 15s, ping comment toutes les 15s pour proxies, close auto sur
  `run.completed`)
- `lib/logger.ts` — JSON lines structuré, level-filtered

#### Middleware
- `auth.ts` — parse cookie `bjhunt_session` (JWT BETTERAUTH_SECRET), inject
  `session` dans context (placeholder, swap BetterAuth réel Phase 1.9)
- `tenant.ts` — extrait `orgId/userId` de la session, expose `tenant`
  ContextVariableMap, throw 401 si manquant

#### Routes
- `GET /api/health` — db+redis ping avec timeout 700ms each, 503 si down,
  no auth
- `POST /api/chat/prepare` — auth+tenant, vérifie que le `run_id` appartient
  à l'org via `withTenant`, refuse si run finalisé, émet ticket JWT 5min,
  retourne `{ ticket, expires_in, sse_url }`
- `GET /api/chat/stream/:runId?ticket=...` — pas d'auth cookie (le ticket
  est l'auth), verify ticket, check `runId === claims.run_id`, stream SSE
  depuis Redis avec replay PG si `Last-Event-ID` envoyé

#### Tests
- `tests/health.test.ts` — smoke (skip si POSTGRES_URL absent)
- `tests/sse-jwt.test.ts` — invariants JWT (round-trip ok, audience rejet,
  TTL capé à 300s)

#### Sécurité boundary
- `secureHeaders()` Hono — CSP strict (`default-src 'self'`,
  `frame-ancestors 'none'`), HSTS preload 2 ans, Referrer-Policy
- `cors()` whitelist : `bjhunt.com`, `app.bjhunt.com`, `localhost:3000` dev
- `compress()` désactivé sur `/api/chat/stream/*` (incompat SSE)
- 404 + onError handlers JSON propres

### Stack opérationnelle sur VPS
- ✅ Coolify v4 (orchestrator) — `http://82.25.117.79:8000`
- ✅ Postgres 17 + pgvector 0.8.2 (port `127.0.0.1:5432`)
- ✅ Redis 7-alpine (port `127.0.0.1:6379`)
- ✅ LiteLLM 1.82.3 (port `127.0.0.1:4000`, db+cache OK, 4 modèles Ollama Cloud)

### Prochaines étapes
- [x] ~~Modifier prompts système openclaude pour cybersec offensive~~ → pack `bjhunt/IDENTITY.md` livré sur `feat/bjhunt-v2.1-pack`
- [x] ~~Adapter tools : ajouter wrappers cybersec~~ → décision : Bash + sandbox Kali E2B suffit (pas de wrappers TS)
- [ ] **Phase 1.5** Modifier `src/constants/prompts.ts` du fork pour injecter `IDENTITY.md` en tête du system prompt master + tests anti-leak (jamais "I'm Claude")
- [ ] **Phase 1.5** Implémenter les 3 hooks critiques (`scope-guard.cjs`, `evidence-capture.cjs`, `redact-secrets.cjs`) + script `sign-pdf.sh` PKCS#7
- [ ] **Phase 1.6** Wireguard mesh Fly.io ↔ Hostinger
- [ ] **Phase 1.7** Caddy/TLS ou Cloudflare Tunnel devant Coolify (sécuriser port 8000)
- [ ] **Phase 1.8** Stub backend Hono+Bun : `/api/health`, `/api/chat/prepare`, `/api/chat/stream/:runId` + auth BetterAuth + Postgres RLS FORCE multi-tenant
- [ ] **Phase 1.9** Image sandbox Kali : Dockerfile `bjhunt-kali` + intégration E2B Pro per-engagement
- [ ] **Phase 1.10** Frontend POC chat UI : EventSource + render des 12 SSE events
- [ ] **Phase 1.11** Test end-to-end : engagement minimal sur Juice Shop / DVWA / DVNA dans sandbox → findings → rapport PCI-DSS PDF signé
