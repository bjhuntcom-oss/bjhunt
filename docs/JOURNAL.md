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

### Prochaines étapes
- [ ] **#27** Provisionner Hostinger : Docker + Coolify + Postgres 17 + Redis 7 + LiteLLM proxy
- [ ] Modifier prompts système openclaude pour cybersec offensive
- [ ] Adapter tools : retirer git/npm, ajouter wrappers nmap/nuclei/sqlmap (E2B SDK)
- [ ] Stub backend Hono+Bun : `/api/health`, `/api/chat/prepare`, `/api/chat/stream/:runId`
- [ ] Image sandbox Kali : Dockerfile `bjhunt-kali`
- [ ] Frontend POC chat UI : EventSource + render des 12 SSE events
