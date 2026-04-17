# Actions manuelles requises après W2 — 2026-04-17

Les vagues W1 (chat fix) et W2 (sécurité critique) sont déployées. Il reste des actions que **seul toi peux faire** (crédentiels, portails externes, décisions). Ordonné par urgence.

---

## 1. Rotate le token Hostinger API (CRITIQUE — 30 min)

**Pourquoi** : le token est committé dans `.mcp.json:8` sur un repo public GitHub depuis plusieurs semaines. Quiconque a cloné peut commander ton VPS (créer/supprimer snapshots, modifier DNS, facturer).

**Comment** :
1. Va sur https://hpanel.hostinger.com → Comptes → API Tokens.
2. **Révoque** le token actuel.
3. Génère un **nouveau token**.
4. Dans `d:\bjhunt-v2\.mcp.json`, remplace la valeur hardcodée par `${env:HOSTINGER_API_TOKEN}`.
5. Dans ton shell local, `setx HOSTINGER_API_TOKEN "le_nouveau_token"` (Windows) ou export dans `.env.local` (jamais committer).
6. Commit + push.

---

## 2. Activer 2FA GitHub — **deadline 2 mai 2026** (15 jours)

**Pourquoi** : compte restreint sinon (tu ne pourras plus pusher).

**Comment** :
1. https://github.com/settings/security → Two-factor authentication.
2. Active avec une app authenticator (1Password, Authy, ou ton Google Authenticator).
3. Sauvegarde les codes de récupération.

---

## 3. Opt-out Copilot training — **deadline 24 avril 2026** (7 jours)

**Pourquoi** : au-delà, ton code privé peut être utilisé pour entraîner les modèles publics.

**Comment** :
1. https://github.com/settings/copilot → Policies → Content exclusions.
2. Disable "Allow GitHub to use my code snippets for product improvements".

---

## 4. Provisionner hCaptcha sur Vercel (pour beta + contact forms — 15 min)

**Pourquoi** : sans ces env vars, les formulaires `/beta` et `/contact` rejettent toutes les soumissions.

**Comment** :
1. https://www.hcaptcha.com → Sign up → create site "bjhunt.com".
2. Récupère le **sitekey** (public) et le **secret** (server-side).
3. Vercel dashboard → projet `bjhunt` → Settings → Environment Variables :
   - `NEXT_PUBLIC_HCAPTCHA_SITEKEY` = le sitekey public
   - `HCAPTCHA_SECRET` = le secret server-side
4. Redeploy depuis Vercel dashboard (ou push un commit trivial).

---

## 5. Provisionner `ENCRYPTION_KEY` sur le VPS (pour chiffrement provider keys — 10 min)

**Pourquoi** : sans cette clé, le backend fallback sur une dérivation de `SESSION_SECRET` (OK en staging, risky en prod). Et surtout : les clés API des providers (Anthropic, OpenAI, Google, etc.) sont maintenant chiffrées at-rest en base, et `ENCRYPTION_KEY` est ce qui permet de les (dé)chiffrer.

**Comment** :
1. Sur ta machine locale : `openssl rand -base64 32` → copie la valeur.
2. `ssh bjhunt-vps`
3. `cd /opt/bjhunt/app && nano .env`
4. Ajoute la ligne : `ENCRYPTION_KEY=<la_valeur_générée>`
5. `docker compose up -d backend` (pour reloader l'env)
6. **Re-entre toutes les clés providers** dans `/fr/dashboard/admin/gateway` : la migration B3 a NULL-ifié les anciennes plaintext pour forcer le re-chiffrement.

---

## 6. (Optionnel) Vérifier le chat marche chez toi

1. Ouvre https://www.bjhunt.com/fr/login
2. Credentials pré-remplis : admin@bjhunt.com / admin1234567!
3. Va dans /fr/dashboard/chat
4. Nouvelle conversation → envoie "Compte de 1 à 5"
5. Tu dois voir la réponse arriver **token par token en ~5 secondes** (avant c'était bloqué ou très lent).
6. Pendant que ça stream, tu dois pouvoir **retaper dans le textbox** et envoyer un nouveau message — ça abort le stream en cours et envoie le nouveau.

Si ça ne marche pas chez toi alors que ça marche en Playwright MCP : probablement du cache CORS preflight Chrome (24h). Vide le cache : `chrome://settings/content/siteDetails?site=https%3A%2F%2Fwww.bjhunt.com` → Clear data.

---

## Après ça

Une fois ces 5 points faits, on peut démarrer **W3 infra** :
- Backups PG + Neo4j
- Observability (Prometheus + Grafana + Sentry)
- SSH hardening VPS (disable root login + password auth)
- Docker hardening (`cap_drop`, `no-new-privileges`, non-root)
- Migrer `langgraph dev` → `langgraph up` (Postgres-backed, prod-grade)
- Appliquer migration RLS + migrer les 39 `sql\`` restants (`auth.ts`, `chat.ts`, `admin/*`)

Et **W4 engine** :
- Multi-tenant isolation (sandbox par tenant)
- Retirer Docker socket mount langgraph
- Fix Cypher injection
- SafeCommandMiddleware whitelist-based
- Branding cleanup
