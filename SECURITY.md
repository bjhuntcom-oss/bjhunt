# Security Policy

BJHUNT is an AI-powered offensive cybersecurity platform. Security is non-negotiable.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest `main` (rolling) | Yes |
| Older releases | No — please upgrade |

## Reporting a Vulnerability

**Do NOT open public GitHub issues for security vulnerabilities.**

Report privately via:

1. **GitHub Security Advisories** (preferred): https://github.com/bjhuntcom-oss/bjhunt/security/advisories/new
2. **Email**: `security@bjhunt.com` (PGP key available on request)

Please include:
- A description of the vulnerability
- Steps to reproduce
- Affected component(s) (frontend / backend / engine / infra)
- Impact assessment (what an attacker could do)
- Suggested mitigation if you have one

## Response SLA

| Stage | Target |
|---|---|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 business days |
| Fix for CRITICAL/HIGH | Within 30 days |
| Fix for MEDIUM | Within 90 days |
| Public disclosure | After fix shipped + grace period (default 30 days post-patch) |

## Scope

In-scope:
- BJHUNT frontend (Next.js, hosted on Vercel)
- BJHUNT backend API (Hono+Bun, hosted on VPS)
- Engine integration layer (`bjhunt_engine/`)
- Docker compose / VPS deployment configuration
- CI/CD workflows

Out-of-scope:
- Upstream `decepticon/` package (report to https://github.com/PurpleAILAB/Decepticon/security)
- Upstream OpenHands SDK (report to https://github.com/OpenHands/OpenHands/security)
- Third-party dependencies (report upstream + open issue here for tracking once disclosed)
- Issues in test/staging environments without production impact
- DoS via legitimate API calls (rate limiting is the mitigation)

## Pre-deployment Security Checklist

Per `docs/architecture/14-SECURITY.md` — every release must verify:

- [ ] All secrets in `.env` (not in code)
- [ ] `.env` in `.gitignore`
- [ ] Gitleaks finds no secrets in repo
- [ ] CSP is `strict-dynamic` with nonce (no `unsafe-eval`)
- [ ] CORS whitelist exact origins (no `*`)
- [ ] Rate limiting active on all public endpoints
- [ ] Argon2id for passwords (not bcrypt, not SHA)
- [ ] Sessions in PostgreSQL (not JWT client-side)
- [ ] RLS active on multi-tenant tables
- [ ] Containers with `no-new-privileges` and `cap_drop: ALL`
- [ ] Sandbox on isolated network (no access to management network)
- [ ] StrictCommandMiddleware active (whitelist mode)
- [ ] Trivy scan passes on Docker images
- [ ] Daily backup functional
- [ ] Health checks on all services
- [ ] HSTS active with `preload`

## Hall of Fame

Security researchers who responsibly disclosed will be credited here (with consent).

_None yet — be the first._
