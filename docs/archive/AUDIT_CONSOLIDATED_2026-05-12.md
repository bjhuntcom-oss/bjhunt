# RAPPORT D'AUDIT CONSOLIDÉ — BJHUNT 4 MAX

**Date** : 2026-05-12
**Scope** : 6 repos + VPS Hostinger + DB production
**Auditeurs** : 5 agents parallèles (A→E) + web research
**Score global** : **B+**

---

## Vue d'ensemble par composant

| # | Composant | Score | Rapport détail | Top risque |
|---|---|---|---|---|
| A | Frontend marketing (`bjhunt-v2`) | B+ | Rapport structuré agent A (fourni dans le contexte des résultats ci-dessus) | `/labs/audit` POC encore présent côté public |
| B | Backend (`bjhunt-backend`) | B+ | `AUDIT_BACKEND_2026-05-12` texte brut | `requireEmailVerification: false`, fuite token CLI, pas de rate-limit SSE |
| C | Engine (`bjhunt-engine`) | B+ | `AUDIT_RAPPORT_2026-05-12.md` | 84 % personas stubs, bridge REPL complexe, redact-secrets incomplet |
| D | App dashboard (`bjhunt-app` + assistant-ui) | B− | `docs/AUDIT_UI_UX_2026-05-12.md` | assistant-ui version non pinnée exactement, monolithique `bjhunt-runtime.ts` (1342 lignes), 0 test composant |
| E | Infra VPS Hostinger | B+ | `docs/AUDIT_VPS_2026-05-12.md` | Secrets en clair `.env`, WireGuard sans peer, images mortes 40 GB |

---

## Consolidation des TOP 10 risques transversaux

| # | Risque | Composants | Sévérité | Action immédiate |
|---|---|---|---|---|
| 1 | **Email verification désactivée (`requireEmailVerification: false`)** | Backend | 🔴 Critique | Activer `requireEmailVerification: true` + wire SMTP Resend OU désactiver l'inscription publique |
| 2 | **Token MCP relay fuité via arguments CLI (`ps aux`)** | Backend → Engine | 🔴 Critique | Passer `--mcp-config` via fichier temporaire `/tmp/bjhunt/<chatId>.mcp.json` mode 0600 |
| 3 | **Assistant-ui non pinné exactement (`^0.12.27`)** | bjhunt-app | 🔴 Critique | Remplacer par `"0.12.27"` exact (sans `^`) dans `package.json` |
| 4 | **84 % des personas sont des stubs** (~32/38) | Engine | 🟠 Haut | Compléter `api-pentester`, `auth-pentester`, `cloud-aws`, `cloud-azure` en P0 (2 sem. estimées) |
| 5 | **Pas de rate-limit sur SSE `/api/chat/stream`** | Backend | 🟠 Haut | Ajouter `rateLimit({ bucket:'sse-connect', limit:5, windowSeconds:60 })` |
| 6 | **Secrets `.env` en clair sur disque VPS** | Infra | 🟠 Haut | Migrer vers `sops`+Age, Docker secrets, ou Vault |
| 7 | **Bridge REPL `replBridge.ts` complexe sans tests reconnect** | Engine | 🟠 Haut | Ajouter tests E2E reconnect forcé (`SIGUSR2`, work re-dispatch) |
| 8 | **Monolithique `bjhunt-runtime.ts` (1342 lignes)** | bjhunt-app | 🟡 Moyen | Refactor en modules : `projection/`, `tokens/`, `queue/`, `history/` |
| 9 | **`redact-secrets.cjs` manque DB URI, Azure SP, GitLab, Twilio** | Engine | 🟡 Moyen | Étendre les 15 patterns + tests unitaires |
| 10 | **RLS `users` policy bypass login** | Backend DB | 🟡 Moyen | Documenter le bypass nécessaire + vérifier `WHERE id=` strict |

---

## Recommandation stratégique — Chat UI

### Matrice alternatives (extrait audit D)

| Critère | assistant-ui (actuel) | Vercel AI SDK UI | CopilotKit |
|---|---|---|---|
| Streaming SSE | ✅ ExternalStoreRuntime | ✅ Natif | ✅ AG-UI protocol |
| Tool calls UI | ✅ `tool-call` parts | ✅ exp. streaming | ✅ Human-in-the-loop |
| Branding 100% | ✅ Primitives headless | ⚠️ Hooks seuls, UI maison | ⚠️ Orienté copilot embed |
| Next.js 16 / React 19 | ✅ | ✅ | ✅ |
| Taille bundle gzip | ~40-60 ko | ~8-12 ko + UI maison | ~80-120 ko |
| Migration cost | 0 j | 15-20 j | 20-25 j |

### Verdict : **Rester sur assistant-ui fork + roadmap de migration progressive Vercel AI SDK UI**

- **Court terme (Phase 2)** : Rester sur assistant-ui, mais pinner exactement + refactor `runtime.ts` + tests composants.
- **Moyen terme (Q3 2026)** : Créer un `ChatRuntimeAdapter` abstrait avec 2 implémentations (`AssistantUiAdapter` + `VercelAiSdkAdapter`).
- **Long terme (Q4 2026 – H1 2027)** : Basculer progressivement vers Vercel AI SDK UI si les tests beta sont concluants.

---

## Actions immédiates (ordre de priorité)

### Aujourd'hui (0-24h)
1. **Pinner exactement** `@assistant-ui/react` dans `bjhunt-app/package.json`
2. **Réparer `package.json` bjhunt-app** : retirer `^` sur React 19 aussi si nécessaire
3. **Backend** : corriger `engine-process.ts` pour passer le token MCP via fichier
4. **Backend** : ajouter rate-limit SSE (middleware rapide)
5. **Infra** : `docker image prune -a` + `docker buildx prune` (libérer ~40 GB)

### Cette semaine (1-7j)
6. **Backend** : Activer vérification email OU désactiver inscription publique
7. **Engine** : Élargir `redact-secrets.cjs` (+ DB URI, Azure, GitLab, Twilio)
8. **Engine** : Pinner `kalilinux/kali-rolling` à digest SHA256
9. **bjhunt-app** : Refactor `lib/bjhunt-runtime.ts` en 4 modules
10. **Infra** : Supprimer clé SSH RSA Hostinger legacy
11. **Infra** : Vérifier WireGuard (peer vs supprimer interface)

### Ce mois-ci (2-4 sem.)
12. **Engine** : Compléter 8 personas offensifs P0 (`api-pentester`, `auth-pentester`, `cloud-aws`, `cloud-azure`, `cloud-gcp`, `kubernetes-pentester`, `exploit-dev`, `post-exploit`)
13. **Engine** : Tests E2E bridge reconnect forcé
14. **Backend** : Uniformiser indexes Drizzle `schema.ts` avec migrations SQL
15. **Backend** : Sanitizer PII dans le logger (`email`, `password`, `token` → `[REDACTED]`)
16. **Infra** : Migrer secrets `.env` vers `sops`+Age ou Docker secrets
17. **bjhunt-app** : Activer `noUncheckedIndexedAccess` dans `tsconfig.json`
18. **bjhunt-app** : Ajouter 3 tests composant React minimum (Thread snapshot, ToolFallback, StreamingStatusPill)

---

*Rapport consolidé généré par BJHUNT 4 MAX — Audit multi-agents automatisé.*
