# 11 — Roadmap rebuild

> Plan séquencé du rebuild post-purge (avril 2026 → MVP fin 2026).

## Phase 0 — Cleanup (terminée 2026-04-29)
- [x] Purge backend / engine / ops / dashboard
- [x] VPS Hostinger teardown (containers + volumes + crons)
- [x] Engine archivé dans `bjhunt-legacy-engine` privé
- [x] Vercel envs nettoyées
- [x] GitHub branches/secrets nettoyés
- [x] Stack cible décidée (fork openclaude + Fly.io + E2B + Hetzner + Cloudflare)
- [x] Documentation architecture v1

## Phase 1 — POC backend (4-6 semaines)

**Objectif** : valider la stack avec un audit `nmap` end-to-end fonctionnel et streamé.

| # | Task | Durée | Bloqué par |
|---|---|---|---|
| 1.1 | Setup comptes Fly.io + E2B + Hetzner Cloud + Cloudflare | 0.5j | Toi (paiements) |
| 1.2 | Provisionner Hetzner CCX43 + Coolify + Postgres 17 + Redis 7 + LiteLLM proxy | 1j | 1.1 |
| 1.3 | Wireguard mesh privé Fly.io ↔ Hetzner | 0.5j | 1.2 |
| 1.4 | Fork openclaude → `bjhuntcom-oss/bjhunt-engine` privé | 0.5j | — |
| 1.5 | Modifier prompts système openclaude pour cybersec (BJHUNT Coordinator + Recon + Reporter) | 2j | 1.4 |
| 1.6 | Adapter tools : retirer git/npm, ajouter nmap (wrapper E2B SDK) | 2j | 1.4, 1.1 |
| 1.7 | Image sandbox `bjhunt-kali:latest` : Kali rolling + nmap + nuclei + ffuf | 1j | — |
| 1.8 | Backend Hono+Bun stub : `/api/health`, `/api/chat/prepare`, `/api/chat/stream/:runId` | 2j | 1.4 |
| 1.9 | Streaming SSE typé : `token`, `tool_call`, `tool_result`, `done`, `ping` | 2j | 1.8 |
| 1.10 | Persistence Redis Streams `stream:{org}:{run}` + Postgres `stream_events` mirror | 2j | 1.9 |
| 1.11 | Auth BetterAuth setup + sessions Postgres | 2j | 1.2 |
| 1.12 | Multi-tenancy `withOrg(orgId, fn)` + RLS FORCE Postgres | 2j | 1.11 |
| 1.13 | JWT ticket signed + verify backend | 1j | 1.12 |
| 1.14 | Frontend POC chat UI : EventSource + 5 event types render | 3j | 1.9 |
| 1.15 | Cancel + AbortSignal end-to-end (tab fermé → kill sandbox) | 1j | 1.14 |
| 1.16 | Heartbeat ping 15s + reconnect avec cursor `Last-Event-ID` | 1j | 1.10 |
| 1.17 | Deploy Fly.io cdg avec `flyctl deploy` | 1j | 1.8 |

**Critère de succès Phase 1** : un user beta peut s'inscrire, lancer un audit `nmap` sur sa propre cible, voir le streaming live, fermer l'onglet et reprendre l'audit où il était.

## Phase 2 — Audit complet pentest (4-6 semaines)

**Objectif** : faire un vrai audit OWASP Top 10 sur un site web client.

| # | Task | Durée |
|---|---|---|
| 2.1 | Sub-agent Soundwave (planning OPPLAN) | 3j |
| 2.2 | Sub-agent Recon complet (subfinder, nuclei full templates) | 4j |
| 2.3 | Sub-agent Exploit (sqlmap, ffuf, manual SSTI) | 5j |
| 2.4 | Format Finding standardisé (CVSS, evidence, remediation) | 2j |
| 2.5 | Generator rapport PDF (template branded) | 3j |
| 2.6 | Mode interactive : `interrupt()` user approval modal | 2j |
| 2.7 | SecurityAnalyzer LOW/MED/HIGH per tool | 2j |
| 2.8 | SecretRegistry per-tenant + masking output SSE | 2j |
| 2.9 | Frontend dashboard `/audits` (liste runs + detail page + report viewer) | 5j |
| 2.10 | Quota enforcement par tier (audits/mois, durée max, RAM sandbox) | 2j |
| 2.11 | Tests d'isolation cross-tenant E2E | 2j |
| 2.12 | Sentry + Better Stack monitoring activé | 1j |
| 2.13 | Beta soft-launch (5-10 users sélectionnés) | — |

**Critère de succès Phase 2** : 5 audits parallèles tournent sans interférence, 1 rapport PDF livré par audit.

## Phase 3 — Beta publique (4 semaines)

**Objectif** : ouvrir la beta à 100 users.

| # | Task | Durée |
|---|---|---|
| 3.1 | Multi-region Fly.io (cdg primaire + ams failover) | 2j |
| 3.2 | Cloudflare WAF + Turnstile + rate limit edge | 1j |
| 3.3 | Onboarding flow (target ownership DNS TXT challenge) | 3j |
| 3.4 | Sub-agents : Analyst (code review) + AD Operator + Cloud Hunter | 1 sem |
| 3.5 | pgvector embeddings sur skills + similar findings | 3j |
| 3.6 | DSAR + right-to-erasure endpoints (RGPD) | 2j |
| 3.7 | Status page Better Stack public | 1j |
| 3.8 | Communication beta opening (LinkedIn + HN + cybersec subreddits) | — |

## Phase 4 — Monétisation (4 semaines)

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
| 4.8 | Email templates (welcome, trial expiring, payment failed) Resend | 2j |

**Critère de succès Phase 4** : 5 customers Pro payants → $1k MRR.

## Phase 5 — Hardening prod & scale (continu)

**Objectif** : monter à 1 000 users actifs sans incident majeur.

| Domain | Items |
|---|---|
| **Sécurité** | SOC2 prep (Vanta), pentest externe annuel, bug bounty privé HackerOne, CodeQL + Semgrep CI |
| **Observability** | OpenTelemetry full stack, Tempo distributed tracing, Loki centralized logs |
| **Reliability** | Multi-region failover, daily restore tests, on-call rotation |
| **Performance** | LLM cache (Redis pour repeated tool prompts), image cosign+SLSA L3, p95 first token <2s |
| **Compliance** | GDPR DPIA, AUP signing au signup, EU AI Act art.50 disclosure |

## Phase 6 — Modèle propriétaire BJHUNT (12-18 mois)

**Objectif** : entraîner notre propre modèle pentest-specialized sur RunPod GPU.

| # | Task | Durée |
|---|---|---|
| 6.1 | Collecte dataset : 10k+ audits anonymisés + curated SKILL.md + write-ups bug bounty publics | 6 mois |
| 6.2 | Fine-tuning sur GLM-5.1 base / Llama 3.3 70B / autre OSS via RunPod H100 | 2 mois |
| 6.3 | Évaluation comparative vs Claude/GPT/GLM cloud sur benchmark interne | 1 mois |
| 6.4 | Déploiement vLLM serving sur RunPod Serverless H100 EU | 1 mois |
| 6.5 | A/B test progressif (5% → 50% → 100% selon perf) via LiteLLM routing | 2 mois |

**Critère de succès Phase 6** : performance ≥ 90% du Claude 4.7 sur benchmark pentest interne, coût LLM divisé par 5.

## Tableau récap

| Phase | Durée cible | Statut | Output principal |
|---|---|---|---|
| 0 — Cleanup | terminé | ✅ | Repo frontend-only, VPS purgé, stack décidée |
| 1 — POC | 4-6 sem | ⏳ | Audit nmap streamé end-to-end |
| 2 — Audit complet | 4-6 sem | ⏳ | OWASP Top 10 + rapport PDF |
| 3 — Beta publique | 4 sem | ⏳ | 100 users beta |
| 4 — Monétisation | 4 sem | ⏳ | Stripe + Pro $200 live |
| 5 — Hardening | continu | ⏳ | SOC2 prep, scale to 1000 users |
| 6 — Modèle proprio | 12-18 mois | ⏳ | Fine-tuned BJHUNT model RunPod |

**Date cible MVP monétisable** : ~14 semaines après go (mi-août 2026 si go début mai).
**Date cible 1k users** : Q1 2027.

## Risques principaux

| Risque | Probabilité | Mitigation |
|---|---|---|
| openclaude DMCA Anthropic | Faible-moyenne | Repo privé, modifications significatives, fallback custom prêt en parallèle |
| Fly.io pricing increase | Faible-moyenne | Plan migration Hetzner k8s prêt |
| E2B Pricing increase | Moyenne | Plan migration Daytona self-host |
| Concurrent (PentAGI, Cobalt next-gen IA) lance avant nous | Moyenne | Différentiation = isolation hardware + souveraineté EU + UX chat |
| LLM provider price spike | Moyenne | Multi-provider via LiteLLM + Phase 6 modèle propriétaire |
| Compliance EU AI Act art.50 deadline 2026-08-02 | Haute | Disclosure intégré au signup + chat header dès Phase 2 |
| Solo dev burnout | Haute | Cadence raisonnable, prioriser ruthless, pas de feature creep |
