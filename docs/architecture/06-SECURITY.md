# 06 — Sécurité

> BJHUNT est une plateforme cybersécurité. Nous sommes nos propres adversaires. La sécurité est non négociable.

## Modèle de menace

| Acteur | Capacité | Motivation | Mitigation primaire |
|---|---|---|---|
| Tenant A vs Tenant B | API authentifiée | Vol de données client / résultats audit | Multi-tenancy 6 layers (cf 04-MULTI-TENANCY.md) |
| Sandbox compromise (RCE dans Kali) | Code dans le sandbox | Pivot vers infra BJHUNT, exfil tokens | Firecracker microVM + cap_drop ALL + non-root + read-only rootfs |
| Outil Kali utilisé pour cible non autorisée | Auth user normal | Attaque contre tiers depuis l'IP BJHUNT | AUP enforced + target whitelist + abuse detection |
| Vol de session client | Cookie / token leak | Imposture | HttpOnly Secure SameSite=Lax, rotation, IP/UA fingerprint, 2FA TOTP |
| Compromission compte BJHUNT staff | Phishing, supply chain | Accès admin → toutes les orgs | 2FA hardware (Yubikey) obligatoire, audit logs append-only, support mode loggé |
| Attaque supply chain dependency | NPM / Python compromise | Code execution backend | Lockfiles pinned, Dependabot, Trivy SBOM scans CI |
| DDoS volumétrique | Bots / botnets | Indispo | Cloudflare WAF + rate limit edge |
| LLM prompt injection (data exfil via cible) | User-controlled output dans tools | Faire fuiter secrets de l'env vers l'attaquant | SecretRegistry mask + SecurityAnalyzer cmd severity + tool budget |
| Cible scannée se défend (counter-attack) | Réponses HTTP malicieuses | RCE dans sandbox via response | Sandbox isolation + outbound network policy (whitelist target only) |

## Couches de défense

### 1. Edge — Cloudflare
- WAF + rate limit
- Turnstile sur les forms publiques
- Geo-blocking si suspect (Russia, NK, etc. sur API endpoints — pas marketing)
- TLS 1.3 only, HSTS preload

### 2. Application — Headers
- `Content-Security-Policy` strict avec nonce per-request (déjà en place — `middleware.ts`)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-site`

### 3. Application — Auth
- Argon2id pour passwords (jamais bcrypt, jamais SHA)
- Session tokens nanoid en cookie HttpOnly Secure SameSite=Lax
- Rotation automatique (sliding 30j)
- 2FA TOTP obligatoire pour Pro tier+, Yubikey pour platform_admin
- Account lockout après 5 échecs / 15min Redis sliding
- Password policy : 10+ chars + lowercase + uppercase + digit
- Backup codes 2FA hashés SHA-256 + constant-time compare

### 4. Application — Inputs
- **Toutes** les entrées validées via Zod schemas
- **Toutes** les chaînes affichées en HTML passées à `lib/sanitize.ts`
- SQL paramétré uniquement (`postgres.js` raw avec ${}), JAMAIS de concaténation
- Cypher paramétré (`tx.run('MATCH (n) WHERE n.id = $id', {id: ...})`)
- Pas de `eval`, pas de `Function()`, pas de `dangerouslySetInnerHTML` sauf markdown sanitized

### 5. Backend — Rate limiting
Toutes les routes API publiques (login, signup, beta, contact, password reset, token refresh) ont un rate-limit Upstash Redis :
- Login : 5/min/IP, lockout 15min après 5 échecs
- Signup : 3/heure/IP
- Beta + Contact : 5/min/IP
- Password reset email : 1/min/email, 5/heure/IP
- API authenticated : 60 req/min/user (Pro), 600 req/min (Enterprise)

### 6. Backend — Secrets
- `.env` gitignored, jamais commit (Gitleaks CI bloque)
- API keys provider stockées chiffrées **AES-256-GCM** avec clé dérivée per-tenant
- `ENCRYPTION_KEY` rotation possible (re-chiffrement migration script)
- Secrets jamais loggés (filter middleware)

### 7. Sandbox — Isolation
| Capability | Setting |
|---|---|
| Runtime | Firecracker microVM |
| User | non-root (uid 1000) |
| Capabilities | `cap_drop: ALL` (sauf NET_RAW si nmap requis explicitement) |
| Filesystem | read-only rootfs, tmpfs `/tmp 2G`, `/workspace 10G` |
| Network namespace | dédié, outbound whitelist target uniquement |
| `no-new-privileges` | true |
| seccomp | default Docker profile + custom syscall denylist |
| Resource limits | 2 vCPU, 4 GB RAM, 50 PIDs, 10 GB disk |
| TTL | 30min idle → kill automatique |
| Image | `bjhunt/sandbox:latest` (Kali rolling, pinned digest, signed cosign) |

### 8. Database — RLS FORCE
Cf [04-MULTI-TENANCY.md](04-MULTI-TENANCY.md). Role app `bjhunt_app` NOSUPERUSER NOBYPASSRLS.

### 9. CI/CD
- Gitleaks scan sur chaque push
- Trivy filesystem scan (CRITICAL/HIGH bloquant)
- Trivy image scan sur chaque docker build
- Dependabot weekly grouped (next, radix, types, tailwind)
- CodeQL + Semgrep (Phase 4)
- SBOM cosign + provenance SLSA L3 (Phase 5)
- Branch protection main : require PR review, require checks pass, no force push, signed commits

### 10. Monitoring
- Audit logs append-only (cf 04-MULTI-TENANCY.md §audit logs)
- Sentry pour errors (sans PII filter)
- Alerts : 5 logins échoués même IP < 10min, >100 tool calls/heure même org, RAM sandbox >80% sur n'importe quel container

## CSP — détail (déjà en place dans `middleware.ts`)

```
default-src 'self'
script-src 'nonce-{nonce}' 'strict-dynamic' 'unsafe-inline' https:
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https:
font-src 'self' data: https://fonts.gstatic.com
connect-src 'self' https://api.hcaptcha.com https://*.posthog.com
frame-src https://newassets.hcaptcha.com https://hcaptcha.com
frame-ancestors 'none'
form-action 'self'
base-uri 'self'
object-src 'none'
worker-src 'self' blob:
manifest-src 'self'
media-src 'self' data: blob:
upgrade-insecure-requests
```

Quand le backend revient :
- Ajouter `connect-src` : `https://api.bjhunt.com`, `https://chat.bjhunt.com`
- Ajouter `report-uri /api/security/csp-report` + `Reporting-Endpoints`
- Activer `require-trusted-types-for 'script'` (post-audit `dangerouslySetInnerHTML`)

## Compliance

### EU AI Act (article 50, deadline 2 août 2026)
- ✅ Badge "AI-generated" dans le chat header (à réimplémenter au rebuild)
- ✅ AUP page `/legal/ai-policy` (existant)
- ⏳ Disclosure obligatoire que le système est IA dans la première interaction

### European Accessibility Act (Directive 2019/882)
- ✅ Accessibility statement `/legal/accessibility`
- ✅ Skip-to-main link (WCAG 2.4.1)
- ⏳ Tests axe-core CI à activer
- ⏳ Aria labels exhaustifs sur le futur dashboard

### CNIL ePrivacy 2026
- ✅ Cookie consent banner avec equal-prominence Reject / Accept
- ✅ Necessary cookies only par défaut, opt-in pour analytics

### RGPD
- ⏳ DSAR (Data Subject Access Request) endpoint `/api/users/me/export` — Phase rebuild
- ⏳ Right to erasure `DELETE /api/users/me` cascade — Phase rebuild
- ⏳ DPO contact : `dpo@bjhunt.com` (à provisionner)

### SOC2 Type II
- Cible 12-18 mois après MVP
- Vanta / Drata pour automation
- Audit logs déjà compliant

## AUP — Acceptable Use Policy

L'utilisateur S'ENGAGE à :
1. Ne lancer d'audit QUE sur des cibles dont il a autorisation explicite (propriétaire, mandat client signé)
2. Ne PAS utiliser BJHUNT pour des activités illégales (CFAA, art. 323-1 CP)
3. Vérifier la target ownership via DNS TXT challenge `bjhunt-verify-{org_id}` avant scan production
4. Respecter les ROE (Rules of Engagement) saisis dans la phase Soundwave

Violation → suspension immédiate + log + signalement aux autorités compétentes si requis.

## Pre-deployment security checklist

À faire vérifier avant chaque release prod :

- [ ] Tous les secrets dans `.env` (jamais en code)
- [ ] `.env` dans `.gitignore`, Gitleaks CI passe
- [ ] CSP `strict-dynamic` avec nonce, pas de `unsafe-eval`
- [ ] CORS whitelist exact (pas de `*`)
- [ ] Rate limiting actif sur public endpoints
- [ ] Argon2id passwords (vérifier `scrypt`/`bcrypt` ne traînent pas)
- [ ] Sessions Postgres-backed (pas de JWT client-side pour auth principale)
- [ ] RLS FORCE actif sur toutes les tables tenant
- [ ] Containers `cap_drop: ALL`, `no-new-privileges`
- [ ] Sandbox sur réseau isolé (no access mgmt network)
- [ ] Trivy passe sur images Docker
- [ ] Daily backup fonctionnel (test de restore mensuel)
- [ ] Health checks sur tous services
- [ ] HSTS actif avec `preload`
- [ ] AUP affichée + accept-flow signup
