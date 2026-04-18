# 14 — Security Model

> C'est une plateforme de cybersecurite. La securite est non-negociable.
> Ce document couvre le modele de menaces et toutes les mesures de protection.

## Modele de menaces

### Assets a proteger

| Asset | Sensibilite | Impact si compromis |
|---|---|---|
| Credentials users (passwords) | CRITIQUE | Takeover de comptes |
| API keys LLM providers | CRITIQUE | Cout financier, abus |
| Donnees d'audit (findings) | HAUTE | Fuite de vulns clients |
| Sessions utilisateur | HAUTE | Usurpation d'identite |
| Infrastructure VPS | CRITIQUE | Pivot vers clients |
| Code source engine | MOYENNE | Avantage concurrentiel |

### Vecteurs d'attaque

| Vecteur | Probabilite | Impact | Mitigation |
|---|---|---|---|
| Injection SQL | Moyenne | Critique | Drizzle ORM parametre, RLS |
| XSS | Moyenne | Haute | CSP strict-dynamic, nonce |
| CSRF | Basse | Haute | Origin check, SameSite cookies |
| Brute force auth | Haute | Haute | Rate limiting, Argon2id |
| Prompt injection agent | Haute | Haute | StrictCommandMiddleware |
| Container escape | Basse | Critique | no-new-privileges, cap-drop |
| Secret leak (env vars) | Moyenne | Critique | .env hors repo, Docker secrets |
| Supply chain | Basse | Critique | Lockfile, Trivy, Gitleaks |
| SSRF via agent | Moyenne | Haute | Network isolation, blocklists |
| Man-in-the-middle | Basse | Haute | TLS everywhere, HSTS |

## Mesures de securite

### 1. Authentification

```
Password:
  - Argon2id (OWASP recommended)
  - memoryCost: 64 MB, timeCost: 3, parallelism: 4
  - Pepper (env var, pas en DB)
  - Min 10 chars, complexite requise

Sessions:
  - Token random 32 bytes (base64url)
  - HttpOnly, Secure, SameSite=Lax
  - Expire: 30 jours, refresh automatique
  - Stocke en PostgreSQL (pas JWT — revocable)

API Keys:
  - Prefix "bj_" + 32 random bytes
  - SHA-256 hash en DB (jamais en clair)
  - Scopes granulaires
  - Rotation supportee
```

### 2. Autorisation

```
RBAC 3 niveaux: user, admin, super_admin
Ownership check sur chaque ressource
RLS PostgreSQL (defense en profondeur)
Middleware order: auth → rbac → ownership → handler
```

### 3. Input Validation

```
Frontend: Zod schemas (validation avant envoi)
Backend: Zod schemas (re-validation systematique)
SQL: Drizzle ORM (jamais d'interpolation de strings)
Command: StrictCommandMiddleware (whitelist de binaires)
Files: Type check, taille limitee, pas d'execution
URLs: Validation de format, blocklist de domaines internes
```

### 4. Transport Security

```
TLS: Caddy auto-TLS (Let's Encrypt)
HSTS: max-age=63072000; includeSubDomains; preload
HTTP/3: Active par defaut (Caddy)
Inter-container: Reseau Docker (meme host, pas de TLS)
  → Phase 2: mTLS avec Caddy sidecar
```

### 5. Content Security Policy

```
default-src 'self'
script-src 'strict-dynamic' 'nonce-{random}'
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob:
font-src 'self'
connect-src 'self' https://api.bjhunt.com
frame-ancestors 'none'
base-uri 'self'
form-action 'self'

PAS de unsafe-eval (jamais)
Nonce genere a chaque requete (middleware Next.js)
```

### 6. Sandbox Isolation

```
Container:
  - Image Kali custom (pas le Docker Hub random)
  - cap-drop ALL + cap-add NET_RAW,NET_ADMIN (minimum requis)
  - no-new-privileges (pas d'escalade via SUID)
  - Memory limit: 2GB (OOM kill si depasse)
  - CPU limit: 2 vCPU
  - PID limit: 256 (prevent fork bomb)
  - Read-only rootfs: false (outils ont besoin d'ecrire)

Reseau:
  - bjhunt-sandbox (bridge, internal pour Neo4j)
  - PAS d'acces a bjhunt-mgmt (backend, postgres, redis)
  - Acces internet: NAT Docker (pour les scans)
  - DNS: Docker resolver uniquement

Filesystem:
  - Pas de volume partage avec d'autres containers
  - Pas de mount du Docker socket
  - /tmp volatile (tmpfs optionnel)

Lifecycle:
  - Cree par job, detruit apres
  - Pas de reutilisation entre users
  - Timeout: max duree audit + 5 min grace period
  - Zombie cleanup: worker periodic
```

### 7. Secrets Management

```
Storage:
  - .env (production, hors git)
  - Docker env_file (injection au runtime)
  - AES-256-GCM pour les secrets en DB
  - JAMAIS de secrets dans le code source

Rotation:
  - API keys: rotation manuelle (user)
  - Sessions: refresh automatique
  - LLM provider keys: rotation manuelle (admin)
  - DB password: rotation lors des deployements

Detection:
  - Gitleaks dans le CI (pre-commit + CI)
  - .gitignore: .env, .env.*, *.key, *.pem
  - Revue de code: grep pour patterns de secrets
```

### 8. Rate Limiting

```
Auth endpoints:
  - Login: 10/min/IP
  - Register: 5/min/IP
  - Password reset: 3/min/IP

API endpoints:
  - General: 100/min/user
  - Audit creation: 5/min/user
  - Stream: 5 concurrent/user

Global:
  - 1000 req/min/IP (DDoS protection basique)

Implementation: Redis sliding window (@upstash/ratelimit)
Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

### 9. Logging & Audit Trail

```
Audit log (PostgreSQL):
  - Toutes les actions auth (login, logout, register)
  - Toutes les actions admin (role change, suspend, delete)
  - Toutes les actions audit (start, stop, complete)
  - API key operations (create, delete, rotate)
  - Settings changes
  - Immutable (pas de DELETE sur audit_logs)

Application log:
  - Structured JSON (pino)
  - Request ID pour le tracing
  - PAS de secrets dans les logs
  - Rotation: 100MB, 5 fichiers

Error tracking:
  - Sentry (production)
  - Source maps uploades en CI
  - PII scrubbed automatiquement
```

### 10. StrictCommandMiddleware (remplace SafeCommand)

```python
# Protection contre l'injection de commandes via les agents IA

BLOCKED:
  - exec, eval, source (execution arbitraire)
  - $(), `` (command substitution)
  - ${...} complexe (variable expansion)
  - Pipe vers shell (| bash, | sh)
  - Ecriture dans /etc, /proc, /sys
  - rm -rf /, shutdown, reboot, halt

ALLOWED (whitelist):
  - Outils de securite: nmap, nuclei, sqlmap, hydra, masscan, ...
  - Utilitaires: curl, wget, dig, host, whois, cat, grep, find, ls
  - Langages: python3, pip, git
  - Session: tmux, screen

LOGGING:
  - Chaque commande executee est logguee
  - Commandes bloquees sont logguees avec raison
  - Alertes si pattern suspect detecte frequemment
```

## Checklist securite pre-deploiement

- [ ] Tous les secrets sont dans .env (pas dans le code)
- [ ] .env est dans .gitignore
- [ ] Gitleaks ne detecte aucun secret dans le repo
- [ ] CSP est strict-dynamic avec nonce (pas unsafe-eval)
- [ ] CORS whitelist les origines exactes (pas *)
- [ ] Rate limiting actif sur tous les endpoints publics
- [ ] Argon2id pour les passwords (pas bcrypt, pas SHA)
- [ ] Sessions en PostgreSQL (pas JWT cote client)
- [ ] RLS active sur les tables multi-tenant
- [ ] Containers avec no-new-privileges et cap-drop ALL
- [ ] Sandbox sur reseau isole (pas d'acces management)
- [ ] StrictCommandMiddleware actif avec whitelist
- [ ] Trivy scan sur les images Docker
- [ ] Backup quotidien fonctionnel
- [ ] Health checks sur tous les services
- [ ] HSTS active avec preload
