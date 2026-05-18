# RAPPORT D'AUDIT COMPLET — BJHUNT-BACKEND
**Date** : 13 mai 2026
**Scope** : Tous fichiers src/, migrations/, contrats API, couplage frontend, ecarts Mastra
**Auditeur** : Agent explore bjhunt-backend

Voir le rapport complet avec TOUTES les sections (inventaire fichier par fichier, contrats API detailles, 17 events SSE, ecarts backend vs Mastra, points de couplage frontend, bottlenecks, risques migration).

## Resume critique

| Metric | Valeur |
|---|---|
| Fichiers src/ | 41 |
| Lignes de code backend | ~5500+ |
| Fichier le plus critique | `src/lib/engine-process.ts` (1010 lignes) |
| Fichier le plus gros | `src/routes/chats.ts` (1067 lignes) |
| Events SSE definis | 17 types |
| Events reels emis | 7-9 types |
| Events frontend ignores | 5 types (agent.progress, agent.handoff, secret.redacted, agent.tool_result, agent.canvas) |
| Types dupliques front/back | 15+ |
| Drifts contracts | `PatchChatBody.status` (front inclut, back rejecte strict) |
| Coût migration estime | 12-16 semaines |

## Verdict migration Mastra

**Mastra remplace engine-process.ts + SSE + suggestions, mais NE remplace PAS :**
- Auth BetterAuth (trop integre)
- RLS PostgreSQL (specifique BJHUNT)
- DB schema metier (findings, evidence, audit_log)
- Sandbox abstraction (a garder comme adapter)
- Catalogues metier (conserver)
- NDA redaction (deplacer vers middleware)
- SecretRegistry (garder)
- Usage metering (garder)

**Strategie recommandee :**
1. Migrer UNIQUEMENT `engine-process.ts` vers des `Mastra Agents` + `Workflows`
2. Conserver Hono + Drizzle (ou migrer Drizzle -> Prisma) pour l'API REST metier
3. Garder `lib/sse.ts` comme couche de transport unifiee
4. Ne pas toucher a BetterAuth sauf si Mastra auth devient mature
