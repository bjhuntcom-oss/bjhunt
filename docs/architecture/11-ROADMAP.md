# 11 — Roadmap rebuild

> Plan séquencé du rebuild post-purge (avril 2026 → MVP fin 2026).

## Phase 0 — Cleanup (terminée — 2026-04-29)
- [x] Purge backend / engine / ops / dashboard
- [x] VPS Hostinger teardown (containers + volumes + crons)
- [x] Engine archivé dans `bjhunt-legacy-engine` privé
- [x] Vercel envs nettoyées
- [x] GitHub branches/secrets nettoyés
- [x] Documentation architecture v1
- [x] Stack cible décidée (OpenHands+LangGraph, Fly.io+Modal+Hetzner)

## Phase 1 — POC backend (cible : 4-6 semaines)

**Objectif** : valider la stack avec un audit end-to-end fonctionnel.

| # | Task | Durée | Bloqué par |
|---|---|---|---|
| 1.1 | Setup comptes Fly.io + Modal + Hetzner Cloud + Cloudflare | 0.5j | Toi (paiements) |
| 1.2 | Provisionner Hetzner Cloud CCX43 + Postgres + Neo4j + Redis (Coolify) | 1j | 1.1 |
| 1.3 | POC orchestrator OpenHands : 1 endpoint `/api/audit/{nmap}` qui spawn DockerWorkspace, exécute, retourne JSON | 2j | 1.1 |
| 1.4 | Câbler streaming SSE basique : token + tool_call + tool_result | 2j | 1.3 |
| 1.5 | Persistence Redis Streams `stream:{org}:{run}` + Postgres `stream_events` | 2j | 1.4 |
| 1.6 | Frontend POC chat UI : EventSource + 4 event types render | 2j | 1.5 |
| 1.7 | Auth basique (à décider Clerk / Auth.js / BetterAuth) | 2j | 1.1 |
| 1.8 | Multi-tenancy WithOrg + RLS FORCE Postgres | 2j | 1.7 |
| 1.9 | JWT ticket signed + verify backend | 1j | 1.7 |
| 1.10 | Cancel + AbortSignal end-to-end (ferme tab → kill sandbox) | 1j | 1.6 |
| 1.11 | Heartbeat ping 15s + reconnect avec cursor `Last-Event-ID` | 1j | 1.5 |

**Critère de succès Phase 1** : un user beta peut s'inscrire, lancer un audit `nmap` sur sa propre cible, voir le streaming live, recevoir 1 finding card, fermer l'onglet et reprendre l'audit où il était.

## Phase 2 — Audit complet pentest (cible : 4-6 semaines)

**Objectif** : faire un vrai audit OWASP Top 10 sur un site web client.

| # | Task | Durée |
|---|---|---|
| 2.1 | Sub-agent Soundwave (planning OPPLAN) | 3j |
| 2.2 | Sub-agent Recon (nmap, subfinder, nuclei info) | 4j |
| 2.3 | Sub-agent Exploit (sqlmap, ffuf, manual SSTI) | 5j |
| 2.4 | Format Finding standardisé (CVSS, evidence, remediation) | 2j |
| 2.5 | Generator rapport PDF (template branded) | 3j |
| 2.6 | Mode interactive : `interrupt()` LangGraph + UI approval modal | 2j |
| 2.7 | SecurityAnalyzer OpenHands tuned pour pentest (LOW/MED/HIGH per tool) | 2j |
| 2.8 | SecretRegistry per-tenant + masking output SSE | 2j |
| 2.9 | Frontend dashboard `/audits` (liste runs + detail page) | 4j |
| 2.10 | Quota enforcement par tier (audits/mois, durée max, RAM sandbox) | 2j |
| 2.11 | Tests d'isolation cross-tenant (E2E) | 2j |
| 2.12 | Beta soft-launch (5-10 users sélectionnés) | — |

**Critère de succès Phase 2** : 5 audits parallèles tournent sans interférence, 1 rapport PDF livré par audit.

## Phase 3 — Beta publique (cible : 4 semaines)

**Objectif** : ouvrir la beta à 100 users.

| # | Task | Durée |
|---|---|---|
| 3.1 | Migration Hetzner+Coolify → Fly.io backbone | 1.5 sem |
| 3.2 | Multi-region Fly.io (cdg + ams) | 2j |
| 3.3 | Cloudflare devant (DNS, WAF, Turnstile) | 1j |
| 3.4 | Onboarding flow (target verification DNS TXT) | 3j |
| 3.5 | Sub-agents : Analyst (code review) + AD Operator + Cloud Hunter | 1 sem |
| 3.6 | Knowledge graph Neo4j (1 DB / tenant) câblé sur les findings | 4j |
| 3.7 | Status page (Better Stack ou Statuspage) | 1j |
| 3.8 | Monitoring stack (Grafana Cloud + Sentry) | 3j |
| 3.9 | DSAR + right-to-erasure endpoints (RGPD) | 2j |
| 3.10 | Communication beta opening (email + LinkedIn + HN/Reddit) | — |

## Phase 4 — Monétisation (cible : 4 semaines)

**Objectif** : Stripe billing + Pro tier $200/mo lancé.

| # | Task | Durée |
|---|---|---|
| 4.1 | Stripe checkout + portal + webhook (idempotent stripe_events table) | 4j |
| 4.2 | Subscription tiers (Free / Pro / Enterprise) + quotas enforced | 3j |
| 4.3 | Stripe Meters API pour overage Pro+Ent ($25 / $15 par audit suppl.) | 3j |
| 4.4 | Dunning flow : invoice failed → email + freeze + grace 7j → downgrade | 3j |
| 4.5 | Trial 14j Pro pour nouveaux signups | 2j |
| 4.6 | Page `/pricing` mise à jour avec CTA Stripe live | 1j |
| 4.7 | Customer portal `/dashboard/billing` | 3j |
| 4.8 | Email templates (welcome, trial expiring, payment failed, etc.) Resend | 2j |

**Critère de succès Phase 4** : 5 customers Pro payants → $1k MRR.

## Phase 5 — Hardening prod & scale (continu)

**Objectif** : monter à 1 000 users actifs sans incident majeur.

| Domain | Items |
|---|---|
| **Sécurité** | SOC2 prep (Vanta), pentest externe annuel, bug bounty privé HackerOne, CodeQL + Semgrep CI |
| **Observability** | OpenTelemetry full stack, Tempo distributed tracing, Loki centralized logs |
| **Reliability** | Multi-region Fly.io ams + cdg failover, daily restore tests, on-call rotation |
| **Performance** | LLM cache (Redis pour repeated tool prompts), sandbox image cosign+SLSA L3, p95 first token <2s |
| **Compliance** | GDPR DPIA, AUP signing au signup, RGPD DSAR endpoint, EU AI Act art.50 disclosure |

## Phase 6 — Modèle propriétaire BJHUNT (12-18 mois)

**Objectif** : entraîner notre propre modèle pentest-specialized sur RunPod GPU.

| # | Task | Durée |
|---|---|---|
| 6.1 | Collecte dataset : 10k+ audits anonymisés + curated SKILL.md + write-ups bug bounty publics | 6 mois |
| 6.2 | Fine-tuning sur GLM-5.1 base / Llama 3.3 70B / autre OSS via RunPod H100 | 2 mois |
| 6.3 | Évaluation comparative vs Claude/GPT/GLM cloud sur benchmark interne | 1 mois |
| 6.4 | Déploiement sur Modal (vLLM serving) avec routing LiteLLM | 1 mois |
| 6.5 | A/B test progressif (5% → 50% → 100% selon perf) | 2 mois |

**Critère de succès Phase 6** : performance > 90% du Claude 4.7 sur benchmark pentest interne, coût LLM divisé par 5.

## Tableau récap

| Phase | Durée cible | Statut | Output principal |
|---|---|---|---|
| 0 — Cleanup | terminé | ✅ | Repo frontend-only, VPS purgé |
| 1 — POC | 4-6 sem | ⏳ | Audit nmap streamé end-to-end |
| 2 — Audit complet | 4-6 sem | ⏳ | OWASP Top 10 + rapport PDF |
| 3 — Beta publique | 4 sem | ⏳ | 100 users beta |
| 4 — Monétisation | 4 sem | ⏳ | Stripe + Pro $200 live |
| 5 — Hardening | continu | ⏳ | SOC2 prep, scale to 1000 users |
| 6 — Modèle proprio | 12-18 mois | ⏳ | Fine-tuned BJHUNT model |

**Date cible MVP monétisable** : ~14 semaines après go (mi-août 2026 si go début mai).
**Date cible 1k users** : Q1 2027.

## Risques principaux

| Risque | Probabilité | Mitigation |
|---|---|---|
| OpenHands V1 API breaking changes | Moyenne | Pin version, monitor releases, tests E2E |
| Fly.io pricing increase | Faible-moyenne | Plan migration Hetzner k8s prêt |
| Concurrent (PentAGI, Cobalt next-gen IA) lance avant nous | Moyenne | Différentiation = isolation hardware + souveraineté EU + UX chat |
| LLM provider price spike (Anthropic, Ollama Cloud) | Moyenne | Multi-provider via LiteLLM + Phase 6 modèle propriétaire |
| Compliance EU AI Act art.50 deadline 2026-08-02 | Haute | Disclosure intégré au signup + chat header dès Phase 2 |
| Solo dev burnout | Haute | Cadence raisonnable, prioriser ruthless, pas de feature creep |

## Décisions à prendre AVANT Phase 1

- [ ] Auth provider (BetterAuth / Auth.js / Clerk / Custom) — voir [10-DECISIONS.md ADR-008](10-DECISIONS.md)
- [ ] Casting agents : réutiliser noms Decepticon ou rebrand complet ?
- [ ] Image Kali sandbox : maintainer notre propre Dockerfile ou utiliser kalilinux/kali-rolling avec overlay ?
- [ ] Frontend auth : intégrer dans Vercel (Server Actions) ou full-API depuis Fly.io ?
- [ ] Database migrations tool : dbmate / node-pg-migrate / Atlas / Drizzle Kit ?
