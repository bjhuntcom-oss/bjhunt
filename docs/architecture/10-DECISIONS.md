# 10 — Décisions d'architecture (ADR)

> Une ADR par décision structurante. Format minimaliste : contexte, décision, alternatives écartées, conséquences.

## ADR-001 — Purge totale du backend legacy
**Date** : 2026-04-29
**Statut** : Accepté

**Contexte** : Le repo monorepo BJHUNT contenait un backend Hono+Bun custom + un fork Decepticon (17 agents IA en Python LangGraph) + un VPS Hostinger avec 12 services Docker. État : ~50 findings d'audit sécurité non résolus, dette technique W4-W11 estimée à 13-15 jours de dev, pas de monétisation effective, pas d'utilisateurs payants. Le rebuild from-scratch sur un framework agentique mature (OpenHands SDK V1) coûterait ≤ ce que coûterait combler la dette.

**Décision** : Purger backend, engine, ops, dashboard du repo. Garder uniquement le frontend marketing public. Archiver l'engine dans repo privé `bjhunt-legacy-engine` pour mémoire.

**Alternatives écartées** :
- *Continuer la dette* : ROI négatif, équipe solo dev sous-eau
- *Maintenir backend, refonte progressive* : trop lent, pas de momentum
- *Vendre/fork to community OSS* : pas pertinent à ce stade

**Conséquences** :
- ✅ Repo propre, frontend deploy-able sur Vercel sans backend
- ✅ VPS Hostinger libéré (peut être resilié ou recyclé)
- ❌ Aucun produit fonctionnel temporairement (4-8 semaines rebuild)
- ❌ Beta signups en attente (pas de risque produit livré → différer le launch)

---

## ADR-002 — Backend rebuild sur OpenHands SDK V1 + LangGraph hybride
**Date** : 2026-04-29
**Statut** : Accepté (sous-réserve POC validation)

**Contexte** : Phase 2 recherche a comparé 9 frameworks agentiques. OpenHands V1 (arxiv:2511.03690 nov 2025) est conçu *by design* pour SaaS multi-tenant agentique : `DockerWorkspace` per-engagement built-in + `SecurityAnalyzer` typé (LOW/MED/HIGH par command). LangGraph reste mature pour orchestration multi-agent + checkpointing Postgres natif.

**Décision** : Hybride — LangGraph pour graph state machine + checkpointing, OpenHands pour le runtime workspace + security analyzer.

**Alternatives écartées** :
- *LangGraph seul* : sandbox + multi-tenant à coder à la main (coût équivalent à la dette legacy)
- *CrewAI* : excellent role-based, pas de sandbox natif → même problème
- *Warp/Oz* : client AGPLv3 contamine SaaS commercial
- *Goose* : agent desktop, pas SaaS
- *AutoGen / MAF Microsoft* : split AutoGen v0.7 / AG2 / MAF en avril 2026, adoption incertaine
- *smolagents* : excellent CodeAgent paradigm mais 26k★ moins mature pour prod
- *Vercel AI SDK 5* : front/edge focus, pas un orchestrateur backend

**Conséquences** :
- ✅ DockerWorkspace built-in = isolation hardware-level sans coder
- ✅ SecurityAnalyzer typé > legacy SafeCommandMiddleware blacklist (fragile)
- ✅ LiteLLM commun aux deux → switch provider = 1 ligne config
- ❌ Hybride = 2 frameworks à apprendre (mais leur intégration est documentée)
- ⚠️ OpenHands V1 toujours jeune (papier nov 2025) — risque d'API breaking

**POC validation requis avant lock-in** : 1 endpoint Fly.io qui spawn DockerWorkspace, exécute `nmap`, stream SSE → 2-3j effort.

---

## ADR-003 — Hosting cible Fly.io + Modal + Hetzner
**Date** : 2026-04-29
**Statut** : Accepté

**Contexte** : Phase 2 recherche a comparé 13 plateformes hosting. BJHUNT exécute des outils Kali réels = exigence isolation hardware-level (Firecracker microVM). SSE long-lived 30min audits.

**Décision** : Fly.io (backbone API + sandboxes Firecracker) + Modal (AI inference scale-to-zero, futur replacement Ollama Cloud) + Hetzner Cloud Falkenstein DE (Postgres + Neo4j + Redis, souveraineté EU pure).

**Alternatives écartées** :
- *AWS Fargate* : 3x prix, lock-in maximal, pas de réelle souveraineté EU (Cloud Act)
- *GCP Cloud Run* : gVisor seul, **insuffisant** pour exec exploits
- *Lambda + SFN* : 15min cap incompatible avec audits 30min
- *Coolify+Hetzner seul* : containers shared kernel, disqualifié pour Kali sandbox
- *Vercel pour le backend* : 60-300s timeout incompatible SSE long
- *Modal pour tout* : SDK propriétaire = lock-in
- *Self-host k8s Hetzner* : ops 24/7 impossible solo dev

**Plan bootstrap** : Hetzner CCX43 + Coolify + Modal (~$1.5k/mo) jusqu'à ~1 000 users payants, puis migration Fly.io.

**Conséquences** :
- ✅ Migration sortie cheap (Docker partout, Modal SDK encapsulable)
- ✅ Souveraineté EU pure pour DBs (Hetzner DE)
- ✅ Coût 5-10× moins cher qu'AWS équivalent
- ❌ Multi-vendor = ops un peu plus complexe que tout-AWS
- ❌ Hetzner DBs = nous gérons les backups/patches/upgrades

---

## ADR-004 — Streaming SSE + Redis Streams + JWT ticket
**Date** : 2026-04-29
**Statut** : Accepté

**Contexte** : Phase 2 recherche a comparé SSE / WebSocket / gRPC-web / HTTP/3. SSE est le standard de fait 2025-2026 (OpenAI, Anthropic, Vercel AI SDK 5, LangGraph). Audits 30min nécessitent resume after disconnect.

**Décision** : SSE primary transport, JWT ticket court (5min) pour auth, Redis Streams par tenant pour live tail + Postgres `stream_events` table pour persistence 7j.

**Alternatives écartées** :
- *WebSocket* : bidi pas nécessaire (POST séparé pour user message), reconnect non natif, sticky-session lourd
- *gRPC-web* : overhead schema proto pas justifié pour texte
- *HTTP/2 push* : deprecated Chrome 2022
- *Cookies + EventSource* : CORS cross-subdomain fragile en 2025+ (Chrome SameSite changes)
- *Long polling* : moins efficace, pas de stream natif

**Conséquences** :
- ✅ Compatible avec tous proxies/CDN
- ✅ Auto-reconnect natif EventSource via `Last-Event-ID`
- ✅ Pattern signed ticket = stateless + tenant-safe + courte durée
- ❌ EventSource ne supporte pas custom headers (mitigé par ticket sur URL)

---

## ADR-005 — Multi-tenancy via Postgres RLS FORCE + 1 sandbox par engagement
**Date** : 2026-04-29
**Statut** : Accepté (déjà appliqué dans le legacy, à reprendre)

**Contexte** : 6 couches d'isolation (cf 04-MULTI-TENANCY.md). Tenant isolation est non négociable.

**Décision** : 
- App layer : `withOrg(orgId, fn)` wrapper obligatoire
- DB layer : Postgres RLS `FORCE` sur toutes les tables tenant + role `bjhunt_app` NOSUPERUSER NOBYPASSRLS
- Knowledge graph : 1 Neo4j DB par tenant
- Sandbox : 1 OpenHands DockerWorkspace per-engagement (long-running, TTL 30min idle)
- Streaming : Redis Streams `stream:{org_id}:{run_id}` + cancel channel séparé
- Secrets : AES-GCM chiffrement avec clé per-tenant dérivée HKDF

**Alternatives écartées** :
- *Schema-per-tenant Postgres* : explose le nombre de schémas, migrations cauchemar
- *DB-per-tenant Postgres* : trop coûteux pour <10k tenants
- *Sandbox shared cluster + namespacing* : insuffisant pour exec exploits
- *Cypher namespace label* : moins safe que DB séparée

**Conséquences** :
- ✅ Defense-in-depth — un bug seul ne casse pas l'isolation
- ✅ Audit logs append-only montrent toute violation tentée
- ❌ Performance overhead Postgres RLS ~5-10% (acceptable)
- ❌ Coût : 1 sandbox par engagement actif = peut grimper avec scale (mitigation : TTL idle 30min)

---

## ADR-006 — Souveraineté EU & RGPD natif
**Date** : 2026-04-29
**Statut** : Accepté

**Contexte** : Cible client : startups EU + équipes sécurité internes EU + consultants pentest EU. RGPD non-compliance = risque légal majeur. Cloud Act US = leak potentiel données client US-pos vers gouv US.

**Décision** : Toutes les données tenant (PG, Neo4j, Redis, R2 EU jurisdiction) hébergées en Allemagne / France. Modal (US) ne reçoit QUE les prompts LLM de-PII (personally-identifiable info masquée par SecretRegistry avant envoi). DPO dédié. AUP visible. EU AI Act art.50 (badge AI), EAA accessibility, CNIL ePrivacy 2026.

**Alternatives écartées** :
- *AWS eu-west-3 Paris* : owned by Amazon US → Cloud Act applicable
- *GCP europe-west1* : idem
- *Azure France Central* : idem
- *Tout US uniquement* : disqualifie marché EU enterprise

**Conséquences** :
- ✅ Pitch souveraineté différenciant pour Enterprise EU
- ✅ Compliance prête pour SOC2 Type II + ISO 27001 future
- ❌ Coûts un peu plus élevés que AWS spot
- ❌ Latence Modal (US-east) ~80ms aller-retour Europe (acceptable pour LLM async)

---

## ADR-007 — Frontend marketing reste sur Vercel
**Date** : 2026-04-29
**Statut** : Accepté

**Contexte** : Frontend Next.js 16 marketing site est gratuit (Hobby) sur Vercel, déjà branché à GitHub auto-deploy. Performance edge top.

**Décision** : Garder Vercel pour le marketing site. Le futur dashboard authentifié peut soit rester sur Vercel (preview deploys + edge SSR) soit basculer sur Fly.io selon les besoins SSE long.

**Alternatives écartées** :
- *Auto-host Caddy + Next.js sur Hetzner* : pas justifié à ce stade (gratuit Vercel)
- *Cloudflare Pages* : OK mais pas de avantage net vs Vercel
- *AWS Amplify* : pricing unfavorable

**Conséquences** :
- ✅ Zero-effort deploy + preview branches
- ❌ Vendor lock-in léger (mitigation : stack standard Next.js portable)
- ❌ Si on dépasse le free tier (1TB bandwidth/mo), monter en Pro $20/mo

---

## ADR-008 — Auth provider à décider (Phase POC)
**Date** : 2026-04-29
**Statut** : Ouvert — décision Phase POC

**Contexte** : Le backend rebuild aura besoin d'un système d'auth (login, signup, sessions, 2FA, RBAC).

**Candidats** :
- **BetterAuth** (TS, self-host, sessions DB-backed) — moderne, full-control
- **Auth.js v5** (NextAuth) — très intégré Next, bon pour le frontend
- **Clerk** (managed) — paye, mais zéro setup, top UX
- **Custom** (comme le legacy) — full control mais maintenance

**Critères pour décider** :
- Coût à scale (1k users → 10k users)
- 2FA TOTP + Yubikey support
- RBAC org_owner / admin / operator / viewer
- Compliance EU data residency
- Migration depuis le legacy (table users existante en schéma)

À trancher au moment du POC backend. Probablement BetterAuth ou Auth.js v5 (open source + EU-host facile).

---

## Comment ajouter une nouvelle ADR

1. Numéro suivant (ADR-009, etc.)
2. Format : Date + Statut (Proposé / Accepté / Déprécié / Remplacé par ADR-XXX)
3. Sections : Contexte, Décision, Alternatives écartées, Conséquences
4. PR avec discussion préalable si décision majeure
5. Update `docs/README.md` index
