# 06 — Sécurité

> BJHUNT est une plateforme cybersécurité. La sécurité est non négociable.

## Modèle de menace

| Acteur | Capacité | Motivation | Mitigation primaire |
|---|---|---|---|
| Tenant A vs Tenant B | API authentifiée | Vol de données client / résultats audit | Multi-tenancy 6 layers ([04-MULTI-TENANCY.md](04-MULTI-TENANCY.md)) |
| Sandbox compromise (RCE dans Kali) | Code dans le sandbox | Pivot vers infra BJHUNT, exfil tokens | E2B Firecracker microVM + cap_drop ALL + non-root + read-only rootfs |
| Outil Kali utilisé pour cible non autorisée | Auth user normal | Attaque contre tiers depuis IP BJHUNT | AUP enforced + target whitelist DNS TXT challenge + abuse detection |
| Vol de session client | Cookie/token leak | Imposture | HttpOnly Secure SameSite=Lax, rotation, IP/UA fingerprint, 2FA TOTP |
| Compromission compte BJHUNT staff | Phishing, supply chain | Accès admin → toutes les orgs | 2FA hardware (Yubikey) obligatoire, audit logs append-only, support mode loggé |
| Attaque supply chain dependency | NPM compromise | Code execution backend | Lockfiles pinned, Dependabot, Trivy SBOM scans CI |
| DDoS volumétrique | Bots / botnets | Indispo | Cloudflare WAF + rate limit edge |
| LLM prompt injection (data exfil via cible) | User-controlled output dans tools | Faire fuiter secrets de l'env vers attaquant | SecretRegistry mask + SecurityAnalyzer cmd severity + tool budget |
| Cible scannée se défend (counter-attack) | Réponses HTTP malicieuses | RCE dans sandbox via response | Sandbox isolation E2B + outbound network policy (whitelist target only) |

## Couches de défense

### 1. Edge — Cloudflare
- WAF avec rules OWASP Top 10
- Turnstile sur les formulaires publics (beta, contact, signup)
- Rate limit edge (avant Fly.io)
- Geo-blocking si suspect (RU, KP, etc. sur API endpoints — pas marketing)
- TLS 1.3 only
- HSTS `max-age=63072000; includeSubDomains; preload`

### 2. Application — Headers
Déjà actifs dans `middleware.ts` + `next.config.ts` :
- **CSP** strict avec nonce per-request (déjà en place)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-site`

À ajouter au rebuild backend :
- `connect-src` mis à jour : `https://api.bjhunt.com`, `https://chat.bjhunt.com`
- `report-uri /api/security/csp-report` + `Reporting-Endpoints`
- `require-trusted-types-for 'script'` (Phase 5 après audit `dangerouslySetInnerHTML`)

### 3. Auth (BetterAuth)
- **Argon2id** pour passwords (jamais bcrypt, jamais SHA)
- Session tokens nanoid en cookie HttpOnly Secure SameSite=Lax
- Rotation automatique (sliding 30j)
- **2FA TOTP** obligatoire pour tier Pro+, Yubikey pour platform_admin
- Account lockout après 5 échecs / 15min Redis sliding
- Password policy : 10+ chars + lowercase + uppercase + digit
- Backup codes 2FA hashés SHA-256 + constant-time compare

### 4. Inputs validation
- Toutes les entrées validées via **Zod** schemas
- Toutes les chaînes affichées en HTML sanitized
- SQL paramétré uniquement (postgres.js raw template literals), JAMAIS de concaténation
- pgvector queries paramétrées
- Pas de `eval`, pas de `new Function()`, pas de `dangerouslySetInnerHTML` (sauf markdown sanitized via rehype-sanitize si on remet)

### 5. Rate limiting
Toutes les routes publiques + auth ont rate-limit Upstash Redis :
| Route | Limite |
|---|---|
| Login | 5/min/IP, lockout 15min après 5 échecs |
| Signup | 3/heure/IP |
| Beta + Contact | 5/min/IP |
| Password reset email | 1/min/email, 5/heure/IP |
| API authenticated | 60/min/user (Pro), 600/min (Enterprise) |
| Chat prepare (start audit) | 10/heure/user (Pro), 100 (Enterprise) |

### 6. Secrets
- `.env` gitignored, jamais commit (Gitleaks CI bloque)
- Secrets backend stockés via `flyctl secrets set` (chiffrés au repos par Fly.io)
- API keys provider tenant : chiffrées **AES-256-GCM** avec clé dérivée per-tenant (HKDF de KMS_MASTER_KEY)
- `KMS_MASTER_KEY` rotation possible (re-chiffrement migration script)
- Secrets jamais loggés (filter middleware Sentry)
- Backup hardware Yubikey du founder pour KMS_MASTER_KEY

### 7. Sandbox isolation (E2B)
| Capability | Setting |
|---|---|
| Runtime | Firecracker microVM (E2B managed) |
| User | non-root (uid 1000) |
| Capabilities | `cap_drop: ALL` sauf `NET_RAW` (pour `nmap -sS`) |
| Filesystem | read-only rootfs, tmpfs `/tmp 2G`, `/workspace 10G` |
| Network | Outbound whitelist target uniquement (configuré per-engagement) |
| `no-new-privileges` | true |
| seccomp | default + custom syscall denylist |
| Resource limits | 2 vCPU, 4 GB RAM, 50 PIDs, 10 GB disk |
| TTL | 30 min idle → kill automatique |
| Image | `bjhunt-kali:<digest>` pinned, signed cosign, scanned trivy CRITICAL/HIGH = 0 |

### 8. Database — RLS FORCE
Cf. [04-MULTI-TENANCY.md](04-MULTI-TENANCY.md). Role app `bjhunt_app` NOSUPERUSER NOBYPASSRLS.

### 9. CI/CD
- **Gitleaks** scan sur chaque push (block si secret détecté)
- **Trivy filesystem scan** (CRITICAL/HIGH bloquant)
- **Trivy image scan** sur chaque docker build
- **Dependabot weekly** grouped (next, types, tailwind)
- **CodeQL** + **Semgrep** (Phase 4)
- **SBOM cosign** + provenance SLSA L3 (Phase 5)
- Branch protection `main` : require PR review, require checks pass, no force push, signed commits

### 10. Monitoring
- **Audit logs** append-only ([04-MULTI-TENANCY.md](04-MULTI-TENANCY.md) §audit logs)
- **Sentry** pour errors (PII filter)
- Alerts :
  - 5 logins échoués même IP < 10 min
  - >100 tool calls/heure même org
  - RAM sandbox >80% sur n'importe quel container
  - Spike error rate >10% req/min

## CSP — détail au rebuild backend

```
default-src 'self'
script-src 'nonce-{nonce}' 'strict-dynamic' 'unsafe-inline' https:
style-src 'self' 'unsafe-inline'
style-src-elem 'self' 'unsafe-inline'
style-src-attr 'unsafe-inline'
img-src 'self' data: blob: https:
font-src 'self' data: https://fonts.gstatic.com
connect-src 'self' https://api.bjhunt.com https://chat.bjhunt.com https://api.hcaptcha.com https://*.posthog.com
frame-src https://newassets.hcaptcha.com https://hcaptcha.com
frame-ancestors 'none'
form-action 'self'
base-uri 'self'
object-src 'none'
worker-src 'self' blob:
manifest-src 'self'
media-src 'self' data: blob:
upgrade-insecure-requests
report-uri /api/security/csp-report
```

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
- ✅ Cookie consent banner avec equal-prominence Reject/Accept
- ✅ Necessary cookies only par défaut, opt-in pour analytics

### RGPD
- ⏳ DSAR endpoint `/api/users/me/export` — Phase rebuild
- ⏳ Right to erasure `DELETE /api/users/me` cascade — Phase rebuild
- ⏳ DPO contact : `dpo@bjhunt.com` (à provisionner)

### SOC2 Type II
- Cible 12-18 mois après MVP
- Vanta / Drata pour automation
- Audit logs déjà compliant

## AUP — Acceptable Use Policy

L'utilisateur S'ENGAGE à :
1. Ne lancer d'audit QUE sur des cibles dont il a l'autorisation explicite (propriétaire, mandat client signé, programme bug bounty actif)
2. Ne PAS utiliser BJHUNT pour des activités illégales (CFAA, art. 323-1 CP)
3. **Vérifier la target ownership via DNS TXT challenge** `bjhunt-verify-{org_id}` avant scan en production
4. Respecter les ROE (Rules of Engagement) saisis dans la phase Soundwave

Violation → suspension immédiate + log forensic + signalement aux autorités si requis.

## Pre-deployment security checklist

À faire vérifier avant chaque release prod :

- [ ] Tous les secrets dans `flyctl secrets` ou `.env` (jamais en code)
- [ ] `.env` dans `.gitignore`, Gitleaks CI passe
- [ ] CSP `strict-dynamic` avec nonce, pas de `unsafe-eval`
- [ ] CORS whitelist exact (pas de `*`)
- [ ] Rate limiting actif sur public endpoints
- [ ] Argon2id passwords (vérifier bcrypt/scrypt ne traînent pas)
- [ ] Sessions DB-backed (pas de JWT client-side pour auth principale)
- [ ] RLS FORCE actif sur toutes les tables tenant
- [ ] Sandbox image `bjhunt-kali` digest pinned, cosign signed, trivy clean
- [ ] Trivy passe sur l'image backend
- [ ] Daily backup fonctionnel (test de restore mensuel)
- [ ] Health checks sur tous services
- [ ] HSTS actif avec `preload`
- [ ] AUP affichée + accept-flow signup
- [ ] DNS TXT challenge target ownership flow testé
