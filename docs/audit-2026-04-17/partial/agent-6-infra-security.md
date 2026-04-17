# Agent 6 — Infrastructure & Security Posture Audit

Date: 2026-04-17
Auditor: Agent 6 (Opus 4.7)
Scope: Docker Compose, Caddy, CI/CD, Secrets, VPS runtime, Backups, Observability, Compliance

---

## Executive summary

The BJHUNT infra/security posture is **not production-ready** and has drifted significantly
from what `CLAUDE.md` describes. The top-tier concerns are:

1. **Docker socket mounted into `langgraph` on a live production VPS.** This is a
   container-breakout path for an LLM-driven red-team agent. Read-only mounting does not
   meaningfully mitigate this.
2. **`langgraph dev` running in production.** The LangGraph runtime is in dev mode
   (`api_variant=local_dev`, watchfiles, no auth), auto-reloading code, on port 2024 —
   exactly what a production deployment must not do.
3. **No container hardening anywhere.** No `cap_drop: ALL`, no `security_opt: no-new-privileges`,
   no `read_only` root fs, LiteLLM/Caddy/LangGraph running as UID 0, sandbox keeping NET_RAW
   without dropping anything else.
4. **Plaintext secret in `.mcp.json` committed to a public GitHub repo.** Hostinger API token
   (full infra takeover capability) is in git history. CI gitleaks is non-blocking.
5. **SSH permits root + password auth on the live VPS**, with port 22 exposed on 0.0.0.0.
   `sslh` (CLAUDE.md's documented multiplex) is **not installed**.
6. **Zero branch protection.** 94 commits in 30 days, 0 merges — all direct pushes to `main`
   by a single unauthenticated personal account that is not yet 2FA-compliant (deadline
   2026-05-02, 15 days from today).
7. **No backups, no DR, no observability, no SECURITY.md, no LICENSE, no CODEOWNERS,
   no Dependabot.** A SaaS that hosts an offensive AI red-team cannot ship without these.
8. **CLAUDE.md is factually incorrect** about the VPS (OS version, sslh, Monarx,
   `/opt/bjhunt/stack/` layout, UFW port set). Operators will make wrong decisions based on it.

Findings below are grouped by scope area, numbered, and cite file:line plus severity.

Severity key: **CRITICAL** → exploitable now / data loss risk / host takeover path;
**HIGH** → security control missing; **MEDIUM** → posture weakness, remediate before GA;
**LOW** → hygiene / polish.

---

## 1. Docker Compose — production hardening

### F1-1 [CRITICAL] Docker socket bind-mounted into `langgraph`
- `docker-compose.yml:195-196`: `volumes: [/var/run/docker.sock:/var/run/docker.sock:ro]`
- Runtime-verified on VPS: `docker inspect bjhunt-langgraph` Mounts shows `Mode: "ro"` bind.

The LangGraph container runs an LLM-driven agent that executes semi-trusted Python and
tool code. A read-only Docker socket still allows the full Docker API read surface:
`ContainerInspect` reveals `.Config.Env` of every sibling container — and we confirmed
that bjhunt-backend's env includes `SESSION_SECRET`, `BJHUNT_API_SECRET`,
`LITELLM_MASTER_KEY`, `POSTGRES_PASSWORD`, `NEO4J_PASSWORD`, `RESEND_API_KEY`,
`OLLAMA_CLOUD_API_KEY` in cleartext. A compromise of `langgraph` is therefore a
compromise of every secret in the stack. Furthermore, "ro" is widely documented as a
false sense of security — see [Docker Runtime Escape](https://opscart.com/docker-runtime-escape-why-mounting-docker-sock-is-worse-than-running-privileged-containers/)
and Unit42 [Container Escape Techniques](https://unit42.paloaltonetworks.com/container-escape-techniques/),
plus OWASP [Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html).
Also echoed in `docs/DEEP-AUDIT-2026-04-16.md:58-71` as #1 critical.

Remediation: eliminate the socket mount. The engine currently uses it to `docker exec`
into `bjhunt-sandbox`. Replace with a proxied channel:
- run an agent-side gRPC/HTTP sandbox daemon inside `bjhunt-sandbox` (listening on
  `bjhunt-sandbox-net` only), or
- front the docker API with a tightly-scoped proxy like `tecnativa/docker-socket-proxy`
  with only `CONTAINERS_EXEC=1` and no ContainerInspect, or
- adopt `nsjail`/kata/gVisor for sandboxing without host socket access.

### F1-2 [CRITICAL] `langgraph dev` in production
- Running process on VPS: `/usr/local/bin/python /usr/local/bin/langgraph dev --host 0.0.0.0 --port 2024 --no-browser` (PID 1057898).
- Image tag: `ghcr.io/bjhuntcom-oss/bjhunt-langgraph:latest`.
- Source: `engine/containers/langgraph.Dockerfile:33`: `CMD ["langgraph", "dev", ...]`.
- Logs show `api_variant=local_dev`, watchfiles constantly firing, `langgraph_api_version=0.7.101`.

`langgraph dev` is the local-development entrypoint; in-memory runtime, file watcher,
no hardening. In production, langgraph expects its platform/server mode (or a
custom FastAPI host) — see [LangGraph production deployment notes](https://dev.to/sai_raghavendra_c7535ddf3/why-your-langgraph-agents-fail-in-production-and-the-architecture-that-fixes-it-5fca).
Already flagged in `docs/DEEP-AUDIT-2026-04-16.md:336-348` (finding #23), but unresolved.

### F1-3 [HIGH] No container capability dropping anywhere
- Every service in `docker-compose.yml` lacks `cap_drop: [ALL]` and `security_opt: [no-new-privileges:true]`.
- Runtime confirmed: `CapDrop: null` on all 8 bjhunt containers (docker inspect).

2026 baseline per [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html),
[Docker Security Best Practices 2026](https://zeonedge.com/blog/docker-security-best-practices-2026-hardening-containers-build-runtime),
and [Docker Container Best Practices 2026](https://jishulabs.com/blog/docker-container-best-practices-2026)
is: drop ALL, add only the required capabilities, and always enable `no-new-privileges`.
None of this is done.

### F1-4 [HIGH] Sandbox runs as root with broad NET capabilities and no other mitigations
- `docker-compose.yml:159-161`: `cap_add: [NET_RAW, NET_ADMIN, NET_BIND_SERVICE]`.
- Runtime: user root, `CapDrop: null`, `ReadonlyRootfs: false`, `SecurityOpt: null`.
- `engine/containers/sandbox.Dockerfile:48-50`: explicitly runs as root "because raw sockets".

nmap SYN scans and packet capture only require the specific capabilities, not full root
on a writable fs. The sandbox should: `user: nonroot`, `cap_drop: ALL`,
`cap_add: [NET_RAW, NET_BIND_SERVICE]` (NET_ADMIN is rarely actually needed), and
`security_opt: [no-new-privileges:true]`. The sandbox also has no seccomp profile
override — consider a tailored one. Sandbox breakout has been flagged as a CIS-relevant
control in 2026 (Palo Alto Unit42 container escape techniques).

### F1-5 [HIGH] No `read_only` root filesystem on any service
- `docker-compose.yml`: no `read_only:` keys. Runtime: `ReadonlyRootfs: false` everywhere.

Databases and Caddy definitely write state — but they can run with `read_only: true`
plus specific `tmpfs` mounts (`/tmp`, `/run`, `/var/cache`) for ephemeral writes, while
named volumes host persistent data paths. Backend, LangGraph, and sandbox should be
`read_only` once mature. Reference: [Aikido no-BS Docker checklist](https://www.aikido.dev/blog/a-no-bs-docker-security-checklist-for-the-vulnerability-minded-developer).

### F1-6 [HIGH] Containers run as root where they don't need to
Runtime verified via `docker top`:
- `bjhunt-caddy` — caddy is root (caddy:2-alpine ships a nonroot `caddy` user capability via official image, but `USER` is not set in root compose).
- `bjhunt-litellm` — Python process as root (UID 0).
- `bjhunt-langgraph` — Python process as root.
- `bjhunt-sandbox` — tmux/bash/sh as root.
Only `bjhunt-backend` (bun:1000) and the database images (postgres:70, redis:999, neo4j:7474) drop privileges internally.

Add `user:` keys in compose (`user: "1000:1000"` for backend is already correct), add
`user: "caddy"` for caddy, rebuild langgraph and litellm images with a nonroot USER.

### F1-7 [HIGH] `neo4j` is dual-homed across `bjhunt-mgmt` and `bjhunt-sandbox-net`
- `docker-compose.yml:139-141` vs `:157-158` vs `:255-259`.
- Runtime confirmed: `app_bjhunt-mgmt` contains `bjhunt-neo4j` AND `app_bjhunt-sandbox-net` also contains `bjhunt-neo4j`.

The architecture diagram in `CLAUDE.md` puts neo4j on the sandbox side only. Dual-homing
neo4j collapses the sandbox/management trust boundary: a compromised sandbox can
exfiltrate via neo4j's mgmt-side interface. Reference: `docs/DEEP-AUDIT-2026-04-16.md:275-283`
(finding #16). Put neo4j on sandbox net only, have the backend/langgraph talk to it via a
dedicated Bolt proxy or through the sandbox-net only.

### F1-8 [HIGH] `bjhunt-sandbox-net` is not `internal: true`
- `docker-compose.yml:258-259`: `driver: bridge`, no `internal:` key.
- Runtime: `Internal: false` on both networks.

The sandbox runs offensive tooling (sqlmap, hydra, nmap SYN, sliver C2 client).
Unrestricted egress to the Internet turns the container into a launchpad for scans
of arbitrary targets at the hoster's IP, which is **a TOS violation risk** for
Hostinger (see Hostinger AUP on port scanning) and a reputation/abuse desk exposure.
Target traffic must go through the sandbox's controlled egress path (tor/socks proxy,
Hostinger outbound NAT filtering, or a firewall netns).
Mark `bjhunt-sandbox-net` with `internal: true` and route outbound through a
dedicated container that enforces allowlist/egress policy.

### F1-9 [HIGH] No PID limits / userns-remap
- No `userns-remap` on the Docker daemon (`/etc/docker/daemon.json` lacks it).
- PID limits are set on most services but sandbox has `pids_limit: 1024`, neo4j/caddy have none (runtime: `PidsLimit: null`).

Enable Docker userns-remap so even "root" inside a container maps to a non-privileged UID
on the host. Add `pids_limit` to every service.

### F1-10 [HIGH] Database ports exposed on host loopback
- `docker-compose.yml:54` (postgres 5432), `:76` (redis 6379), `:137-138` (neo4j 7474/7687), `:98` (litellm 4000), `:185` (langgraph 2024), `:13` (backend 3001).
- Each is bound to `127.0.0.1` — fine for container-to-container via the bridge network.

The loopback binding is correct, but the `ports:` stanza is still unnecessary for services
that only need intra-compose access (postgres, redis, neo4j, litellm). Remove them and
keep only bridge discovery (`postgres:5432` etc.). Each removed binding reduces the
local attack surface and avoids conflicts with host-side services.

### F1-11 [HIGH] Caddy has no memory limit
- `docker-compose.yml:233-235`: has `mem_limit: 256m`.
- Runtime: Memory: 0. The compose file DOES declare it but docker inspect shows 0.

This means the VPS running compose didn't apply the limit (likely v2 compose expects
`deploy.resources.limits.memory` for swarm, and `mem_limit` only works in legacy mode on
some combinations). Convert to `deploy: resources: limits:` or verify mode. Same issue
possibly affects other services. Recommend moving everything to the v2 resources block.

### F1-12 [HIGH] `.env` is world-readable on the VPS
- Runtime verified: `stat -c '%U:%G %a %n' /opt/bjhunt/app/.env` → `root:root 644`.

Live secrets — Postgres, Session, API, Resend, Ollama — readable by any user on the host.
Combined with F2-3 (root SSH on 0.0.0.0) and an SSH brute-force path, this is a
privilege-escalation shortcut. `chmod 600 /opt/bjhunt/app/.env` immediately; ideally move
to `/opt/bjhunt/stack/.env` outside the git working tree (CLAUDE.md describes this layout
but the directory doesn't exist — see F8-1).

### F1-13 [MEDIUM] `env_file: .env` leaks unused vars into containers
- `docker-compose.yml:14, 99, 186`.
- Runtime verified: bjhunt-backend env contains 24 variables, more than the 13 declared
  in `docker-compose.yml` `environment:` block. This includes keys like `RESEND_API_KEY`,
  `OLLAMA_CLOUD_API_KEY` which backend does not need.

Replace `env_file:` with explicit `environment:` per service, or split `.env` into
`.env.backend`, `.env.langgraph`, `.env.litellm`. Minimize blast radius.

### F1-14 [MEDIUM] Secrets passed by environment rather than Docker secrets / mounted files
- All secrets flow through `environment:` keys.

2026 baseline is to use `secrets:` compose keys (reads from files, mounts as `/run/secrets/X`),
or to use an external secret manager like HashiCorp Vault / sops-nix. Env-var secrets
appear in `docker inspect`, crash dumps, and `/proc/PID/environ`. Reference:
[Docker Compose Security Best Practices](https://compose-it.top/posts/docker-compose-security-best-practices).

### F1-15 [MEDIUM] `postgres` schema init mounts a file from the git tree read-only
- `docker-compose.yml:52`: `./backend/src/db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro`.

This only runs on first init but ties Postgres container to the local file layout and
cannot be re-applied for schema changes. The project also has no migrations tool wired
(DEEP-AUDIT flagged `db:migrate` broken). Move to a proper migration runner (atlas,
goose, bun migrate, drizzle, etc.) in the backend build.

### F1-16 [MEDIUM] LiteLLM image is huge (5.6 GB) and not pinned by digest
- `docker-compose.yml:92`: `ghcr.io/berriai/litellm:main-v1.82.3-stable.patch.2`.
- Pin by `@sha256:...` digest to prevent silent tag repoints.

### F1-17 [MEDIUM] `:latest` tags used for the two engine images
- `docker-compose.yml:152, 179`: `ghcr.io/bjhuntcom-oss/bjhunt-{sandbox,langgraph}:${BJHUNT_VERSION:-latest}`.
- `.env.example:34`: `BJHUNT_VERSION=latest`.

Using `:latest` makes rollbacks ambiguous and undermines supply-chain provenance. Every
release must be an immutable tag (semver or git SHA) and pinned by digest if possible.

### F1-18 [MEDIUM] No logging driver / rotation in compose
- No `logging:` keys.

VPS daemon has `max-size: 10m, max-file: 3` globally (good), but per-service overrides
would enable structured/JSON output for Caddy access, Prometheus-friendly cross-
correlation, and PII redaction. Add `logging: driver: json-file, options: max-size, max-file`
to each service.

### F1-19 [MEDIUM] Stray `ecstatic_tu` LiteLLM container on the VPS
- `docker ps` on VPS shows an un-named duplicate container running
  `ghcr.io/berriai/litellm:main-v1.82.3-stable.patch.2` (`docker/prod_entrypoint.sh`) with
  no port binding, alongside the managed `bjhunt-litellm`.

Not malicious, but indicates `docker compose` was run at some point with a different
project name or service name and orphan containers weren't pruned. Run
`docker compose down --remove-orphans`. Also consider `compose.yaml` with
`x-sanity-check` to enforce named project.

### F1-20 [MEDIUM] No `tmpfs` mounts for `/tmp` in services that need write
- Example: langgraph writes tmp files during streaming; backend creates runtime caches.
  With `read_only: true` planned, `tmpfs:` mounts with `noexec,nosuid,size=...` would be
  required. None defined yet.

### F1-21 [LOW] `depends_on: condition: service_healthy` is used — good
- `docker-compose.yml:24-28, 104-106, 172-174, 197-203, 228-232`.
- Kept as positive note: orchestration correctly waits on DB/Redis/LiteLLM/Neo4j health.

### F1-22 [LOW] Sandbox has no healthcheck in compose
- Compose shows no `healthcheck:` stanza for `sandbox`.
- Runtime shows a healthcheck (`tmux -V`) — comes from the Dockerfile HEALTHCHECK?
  No, sandbox.Dockerfile we read doesn't show a HEALTHCHECK either. Yet runtime reports
  status "healthy" — investigate source (possibly the `engine/docker-compose.yml`).

### F1-23 [LOW] No `restart: on-failure` policy tuning
- `restart: unless-stopped` used everywhere. OK, but for short-lived containers
  `on-failure:5` reduces restart loops.

### F1-24 [LOW] `docker compose` plugin on VPS is 5.1.2 — upgradable to 5.1.3
- `apt list --upgradable` output. Minor, but apply during next maintenance window.

---

## 2. Caddy configuration

### F2-1 [HIGH] Caddy routes `api.bjhunt.com` AND `chat.bjhunt.com` to the same backend
- `ops/Caddyfile:1-12`: both hostnames share one site block, both `reverse_proxy backend:3001`.

CLAUDE.md architecture says `chat.bjhunt.com → langgraph:2024` (line ~305 of CLAUDE.md).
Today both hosts go to backend, which then proxies upstream. This layered indirection is
partly responsible for SP3 stream bugs. Split into two site blocks, or at least add
a `@chat host chat.bjhunt.com` matcher that directly proxies to `langgraph:2024` for the
`/api/chat/stream/:id` path. Already flagged `docs/DEEP-AUDIT-2026-04-16.md:282-287` (#17).

### F2-2 [HIGH] HSTS missing `preload` directive and suboptimal for long-term trust
- `ops/Caddyfile:5`: `Strict-Transport-Security "max-age=31536000; includeSubDomains"`.

For production submission to [hstspreload.org](https://hstspreload.org/), the header must be
`max-age=63072000; includeSubDomains; preload`. 2026 guidance from [Caddy hardening](https://hackviser.com/tactics/hardening/caddy),
[Jonesrussell Caddy Hardening](https://jonesrussell.github.io/blog/caddy-security-headers-rate-limiting/).
Only add `preload` when you're certain the domain won't want HTTP-over-apex again.

### F2-3 [HIGH] No additional security headers at the edge
- `ops/Caddyfile:4-7` only sets HSTS and removes `Server`.

Missing 2026-baseline headers (they're already set by Next.js on the Vercel side for
the app, but API/chat responses served by Caddy don't get them):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (or `frame-ancestors 'none'` via CSP)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-site`

### F2-4 [HIGH] No rate limiting at the edge
- No `rate_limit` / `limits` plugin in the Caddyfile.

[Caddy-ratelimit](https://github.com/mholt/caddy-ratelimit) (community module) or
`handle` + `request_body` defensive limits. Critical for login/register/reset-password
endpoints and chat endpoints to protect against enumeration and cost-amplification
abuse (LLM tokens cost money). Can be complemented by backend Redis-based rate
limiting (already partially implemented but fails-open — see DEEP-AUDIT #15). Reference:
[Caddy Hardening: Security Headers and Rate Limiting](https://jonesrussell.github.io/blog/caddy-security-headers-rate-limiting/).

### F2-5 [HIGH] No explicit `tls` block for minimum TLS version
- `ops/Caddyfile`: relies on Caddy defaults. Caddy 2.x defaults to TLS 1.2 min with 1.3
  available, but no explicit policy means future Caddy default shifts could regress.

Set `tls { protocols tls1.3 }` and pin the min version. Per 2026 guidance, TLS 1.2 is
still mandated for compat but 1.3 is the preferred floor for new services.

### F2-6 [HIGH] No `log` directive / no structured access logs
- `ops/Caddyfile`: no `log {` block.

Production Caddy should emit access logs in JSON to a structured file with rotation,
and ideally ship to Loki/Grafana or a managed observability platform. Without this,
the 502 storm seen in live logs (see F2-7) cannot be triaged post-hoc, SOC2-style
audit trails are impossible, and forensics after incidents are limited.

### F2-7 [HIGH] Live 502s due to DNS resolution failures to `backend`
- Caddy logs on the VPS include many entries like:
  `dial tcp: lookup backend on 127.0.0.11:53: server misbehaving`.

This happens on `/api/auth/login`, `/api/auth/me`, `/api/health/live` — i.e. real user
traffic from Vercel is hitting 502. Docker embedded DNS is misbehaving, typically
symptomatic of:
- Network race during container restart.
- IPv6 enabled in the Docker userland DNS resolver.
- Multiple networks causing conflicts.

Set `resolvers 127.0.0.11` explicitly in the Caddyfile `reverse_proxy backend:3001 { lb_policy first; dns_resolvers 127.0.0.11 }` and/or switch `upstreams` to use an IP
after the network stabilizes. Investigate whether the stray `ecstatic_tu` container (F1-19)
contributes to a DNS misbehavior.

### F2-8 [MEDIUM] `:80` handler only serves `/health`
- `ops/Caddyfile:14-16`: `:80 { respond /health "OK" 200 }`.
- Everything else on port 80 has no handler — which means plaintext HTTP requests to
  other paths get Caddy's default 404, not a redirect to HTTPS.

Add a redirect:
```
:80 { redir https://{host}{uri} permanent }
```
Or let Caddy's auto-HTTPS manage plain redirects per host.

### F2-9 [MEDIUM] `flush_interval -1` is set only once globally inside the shared block
- `ops/Caddyfile:10`: inside the reverse_proxy.

OK for SSE chat stream, but this disables response buffering for all paths including
normal JSON endpoints. Generally harmless but slightly degrades small-response perf
when connection is upstream-chunked. Prefer matcher-scoped flush:
```
@sse path /api/chat/stream/*
reverse_proxy @sse backend:3001 { flush_interval -1 }
reverse_proxy backend:3001
```

### F2-10 [MEDIUM] No `:2019` admin API lockdown
- Caddy listens on `2019/tcp` by default (admin API). The Caddy container exposes 2019/tcp
  per `docker ps` output. It's only on the internal network, but still — in 2026 best
  practice, disable the admin API in production images or bind to `127.0.0.1`. Use
  `admin off` in the global options.

### F2-11 [MEDIUM] OCSP stapling not explicitly configured
- Caddy enables OCSP stapling by default, but certain revocation states default to
  "must-not-staple". Pin with explicit `cert_issuer acme` configuration if desired.
  Lower priority since Caddy's defaults are good.

### F2-12 [LOW] `Server` header removal is present — good
- `ops/Caddyfile:6`: `-Server`. Keep.

### F2-13 [LOW] Caddy `2-alpine` base image pinned by tag, not digest
- `docker-compose.yml:219`: `caddy:2-alpine`.
- Multiple Caddy CVEs disclosed March 2026 affecting `v2.10.0–v2.11.1`. Pin a known-good
  version and digest. Reference: [Caddy security advisories](https://github.com/caddyserver/caddy/security/advisories).

---

## 3. CI/CD — GitHub Actions

### F3-1 [HIGH] CI swallows lint / typecheck failures
- `.github/workflows/ci.yml:31`: `run: npx next lint || true` (swallows)
- `:49`: gitleaks run also ends with `|| true`
- `:85, 91, 95`: engine-lint ruff checks all swallow with `|| true`

A CI job that can't fail is a decoration, not a gate. Remove `|| true` everywhere. Root
lint/typecheck script bugs also flagged in DEEP-AUDIT #10 — the pattern is: scripts are
broken and CI covers for them by ignoring errors.

### F3-2 [HIGH] No backend Bun lint/test/typecheck in CI
- `.github/workflows/ci.yml` has no job running `bun run typecheck` in `backend/`.

Backend changes merge without any type/lint verification. Add a `backend-check` job.

### F3-3 [HIGH] No Trivy failure threshold / no output artifact
- `.github/workflows/ci.yml:39-44`: Trivy scans FS, severity CRITICAL,HIGH, but has no
  `exit-code: 1` and no `format: sarif` + upload to GitHub code scanning.

Trivy should: scan fs AND container images; generate SARIF; upload to
`github/codeql-action/upload-sarif`; set `exit-code: 1` on CRITICAL by default. Also
add `trivy config` for Dockerfile/compose misconfigs. Reference:
[Trivy vs Snyk 2026](https://www.aikido.dev/blog/snyk-vs-trivy).

### F3-4 [HIGH] No CodeQL / Semgrep SAST
- No code-analysis workflow present.

2026 baseline: CodeQL (free on public repos, strong TS/JS/Python support) + Semgrep OSS
on changed files. Reference: [Snyk vs CodeQL 2026](https://dev.to/rahulxsingh/snyk-vs-codeql-free-sast-tools-compared-2026-4bp7),
[Snyk vs Semgrep 2026](https://dev.to/rahulxsingh/snyk-vs-semgrep-sca-platform-vs-custom-sast-rules-in-2026-3047).

### F3-5 [HIGH] No SBOM generation / signing / SLSA attestations
- No `cosign sign`, no `anchore/sbom-action`, no `slsa-framework/slsa-github-generator` in any workflow.

For a security platform to claim trust, each container image should be signed via Sigstore/cosign
using OIDC keyless signing, and a SLSA L3 provenance must be attached. Reference:
[SLSA 3 Compliance with GitHub Actions](https://github.blog/security/supply-chain-security/slsa-3-compliance-with-github-actions/),
[sigstore/cosign](https://github.com/sigstore/cosign).

### F3-6 [HIGH] No container image build workflow — images are built on the VPS
- The deploy workflow (`deploy-vps.yml:40`) runs `docker compose up -d --build backend`.
- Sandbox and langgraph images are pulled from `ghcr.io/bjhuntcom-oss/*:latest` but there
  is no workflow that builds/pushes them. They must have been built manually locally
  or by a prior unversioned push.

This is a supply-chain blind spot. Move image builds to GHA with `docker/build-push-action`,
cache with `type=gha`, push to GHCR, sign with cosign, generate SBOM via Syft/Trivy,
attach provenance. Only then pull the exact digest from GHA on the VPS.

### F3-7 [HIGH] Deploy workflow does `git pull` on the VPS — wrong shape
- `.github/workflows/deploy-vps.yml:37-45`: SSH to the VPS and `git pull origin main`.

This means the production machine must:
- Hold a git checkout with write access.
- Have outbound git credentials or anonymous access.
- Build container images on production hardware at deploy time.
Production deploys should pull pre-built signed images and restart containers, not build
them on the host. Also, `git pull` on a live production deploy is racy — mid-pull leaves
a broken state. Prefer atomic deploys: one image per service, health check, then promote.

### F3-8 [HIGH] Deploy workflow only rebuilds `backend`, only restarts `langgraph`
- `deploy-vps.yml:40-41`.

If engine code, sandbox image, Caddyfile, or compose file change, they don't roll out.
Already flagged in DEEP-AUDIT #12 (`docs/DEEP-AUDIT-2026-04-16.md:225-236`).

### F3-9 [HIGH] Deploy workflow uses `ssh-keyscan -H` without pinning
- `deploy-vps.yml:33`: `ssh-keyscan -H 82.25.117.79 >> ~/.ssh/known_hosts`.

This accepts whatever key the host presents at deploy time — there's no TOFU, no
pinned fingerprint. A MITM in the GHA runner path (unlikely but possible) could inject a
different fingerprint. Pin the known host fingerprint as a GitHub secret and verify.

### F3-10 [HIGH] Deploy workflow uses `StrictHostKeyChecking=no`
- `deploy-vps.yml:37`: explicit `-o StrictHostKeyChecking=no`.

Redundant with keyscan but doubly insecure. Remove both and bundle a pinned
`known_hosts` file via `actions/upload-artifact` or secret.

### F3-11 [HIGH] No rollback path
- Deploy is "build, compose up, done". No prior image tag retained, no `docker tag`
  snapshot, no blue/green. If the new build breaks, recovery requires manual intervention.

### F3-12 [HIGH] No branch protection / no merge gate
- `git log --oneline main --since='30 days ago'` → 94 commits, 0 merges. All direct pushes.
  Only committer: `bjhuntcom@gmail.com`. Solo-dev pattern on a public SaaS repo.

For a security platform with live production, enforce: required PR, required status
checks, required code review, linear history, signed commits, no force-push to main.
Configure through repo settings → Branches → Branch rules.

### F3-13 [HIGH] GHA workflows don't set top-level `permissions:`
- `ci.yml`, `deploy-vps.yml` — no `permissions:` block.

Default `GITHUB_TOKEN` has `contents: write` on push events, more than needed. Add top-level:
```
permissions:
  contents: read
```
Per-job elevate only what's needed. Per [GitHub hardening guide](https://docs.github.com/en/actions/security-guides/automatic-token-authentication).

### F3-14 [HIGH] GHA actions not pinned to SHA
- `ci.yml:18,21,58,61,77`: `actions/checkout@v4`, `actions/setup-node@v4`, etc.

2026 best practice is SHA pinning (`@abc1234...`) — tags can be moved. Also pin
`aquasecurity/trivy-action@master` — using `@master` is an active supply-chain risk.

### F3-15 [MEDIUM] Trivy uses `@master` — known anti-pattern
- `ci.yml:40`: `uses: aquasecurity/trivy-action@master`.

Pin to a specific release SHA.

### F3-16 [MEDIUM] Gitleaks is downloaded via curl + piped, no checksum
- `ci.yml:48-49`: `curl -sSfL ... | tar xz`.

Pin the URL to a release, verify sha256sum. Better: use `gitleaks/gitleaks-action@v...`
pinned by SHA.

### F3-17 [MEDIUM] No Dependabot / Renovate
- No `.github/dependabot.yml`, no `renovate.json`.

Known issue also: `npm audit` flagged outdated/vulnerable `next` and `next-intl` (DEEP-AUDIT #13).
Add Dependabot for npm, bun, pip/uv, github-actions, docker.

### F3-18 [MEDIUM] Build job for Next.js doesn't run on backend/engine changes
- `ci.yml:51-68`: only `needs: [lint-and-typecheck]`, runs only on pushes. Fine, but add a
  backend-build and engine-build stage with the same concurrency group.

### F3-19 [MEDIUM] `workflow_dispatch` without `inputs:` gate on deploy
- `deploy-vps.yml:12`: `workflow_dispatch:` empty inputs.

Allow manual deploys, but add a required `confirm: "deploy"` input to reduce accidents.
Also scope the `environment: production` which is present and good.

### F3-20 [MEDIUM] `concurrency` group for deploy allows queueing without cancel
- `deploy-vps.yml:14-16`: `cancel-in-progress: false`.

Correct choice (avoid cancelling mid-deploy), but combined with no rollback this means
a failing deploy blocks subsequent deploys. Consider a failure-handling job.

### F3-21 [MEDIUM] No post-deploy smoke tests beyond a curl
- `deploy-vps.yml:42-45, 47-52`: curls `/api/health/live` and `/api/health/version` and exits.

Add broader smoke: `/api/auth/register` without writing a user, chat stream open-and-close
with a fixture, pg_isready on the postgres container, neo4j ping.

### F3-22 [LOW] Engine lint only runs if engine dir exists, but does `uv sync --frozen || echo`
- `ci.yml:80-85`. Silently degrades without a lockfile. Either add `engine/uv.lock` to git or
  fail hard when it's missing.

### F3-23 [LOW] No CODEOWNERS
- `/CODEOWNERS` and `/.github/CODEOWNERS` both absent.

---

## 4. GitHub account & organizational hygiene

### F4-1 [CRITICAL deadline] 2FA mandatory on 2026-05-02 — 15 days away
Today is 2026-04-17. GitHub has communicated that accounts accessing GitHub.com without
2FA after May 2, 2026 will be progressively locked out. Reference: [Mandatory Github 2FA
before May 2 2026](https://github.com/orgs/community/discussions/191012) and
[About mandatory 2FA](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/about-mandatory-two-factor-authentication).
CLAUDE.md currently says deadline is 27 May 2026 — that's **wrong by 25 days** and
conservative, but the operator should not rely on it. Treat the real deadline as May 2.

Action: enable 2FA on `bjhuntcom-oss` today. Prefer TOTP + at least 2 backup codes stored
in 1Password/Bitwarden. Add a hardware key (FIDO2) as a second factor for the personal
account.

### F4-2 [HIGH deadline] Copilot data-for-training opt-out by 2026-04-24 (7 days away)
Reference: [GitHub Copilot Data Training Policy Change (April 24, 2026)](https://smartscope.blog/en/generative-ai/github-copilot/github-copilot-data-training-policy-2026/),
[Updates to GitHub Copilot interaction data usage policy](https://github.blog/news-insights/company-news/updates-to-github-copilot-interaction-data-usage-policy/).

From April 24, 2026, Copilot Free/Pro/Pro+ users will have their inputs/outputs/snippets
used for model training unless they explicitly opt out at
`github.com/settings/copilot/features` under the Privacy heading.
CLAUDE.md mentions this. Do it now, and document it in the runbook.

### F4-3 [HIGH] Running a multi-tenant paid SaaS under a personal GitHub account
- `bjhuntcom-oss` is a personal account per CLAUDE.md.

When the SaaS takes paying customers, the repository should live under a GitHub
organization. Organizations unlock:
- SAML SSO enforcement
- Required 2FA for members
- IP allow lists for Enterprise
- Enhanced audit log
- Separation of personal vs. business identity
- Security overview dashboard
- Better billing surface (Copilot Business, Advanced Security)

Create `bjhunt-org`, transfer the repo, re-invite the personal account with Owner role.

### F4-4 [HIGH] No security scanning / Advanced Security features
- Repo is public — CodeQL, secret scanning, and Dependabot alerts are free. Enable in
  Settings → Code security.
- No `SECURITY.md` means CVE disclosures have no clear channel.

### F4-5 [MEDIUM] No GitHub Environments for production
- `deploy-vps.yml:22`: `environment: production` exists, but no protection rules
  configured (required reviewers, wait timer, deployment branch rules).

Add required reviewer (self for now), restrict to `main` branch, wait timer 5 minutes.

### F4-6 [LOW] No Issue / PR templates, no contributing guide
- Small hygiene; add `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`, `CONTRIBUTING.md`.

---

## 5. Secrets posture

### F5-1 [CRITICAL] Hostinger API token committed in `.mcp.json`
- `.mcp.json:8` (cite only; value redacted).
- Committed in `235940d chore: add CLAUDE.md project context + MCP config`.
- `.gitleaksignore:14` explicitly tells gitleaks to ignore this file ("needed for dev tooling").

Impact: the Hostinger API token grants full control over the VPS (create/stop/destroy
VMs, change firewall rules, reset root password, take snapshots). Anyone who clones the
repo (public on github.com/bjhuntcom-oss/bjhunt) takes over the VPS.

Remediation (TODAY, non-negotiable, in this order):
1. Rotate the token at hPanel → API tokens → revoke existing + issue new.
2. Remove from `.mcp.json` (use `${input:HOSTINGER_API_TOKEN}` pattern which Claude Code supports).
3. Git-filter-repo or BFG to scrub history. Force-push after coordinating with collaborators (just one).
4. Inform GitHub secret scanning if the token was caught.
5. Audit Hostinger audit logs for any unexpected API calls in the token's lifetime.
6. Move token to an OS-keychain/secret manager or user-scope Claude Code config outside the repo.

Also: `.gitleaksignore` normalizing this is a second-order problem — it teaches every
future developer that this file "is allowed to contain secrets".

### F5-2 [HIGH] CLAUDE.md contains explicit secret-bearing documentation
- `CLAUDE.md` — ~line 8 of `.gitleaksignore` explicitly says "old default credentials as documentation". Looking at the file,
  CLAUDE.md discusses default `sk-decepticon-master`, `POSTGRES_PASSWORD=decepticon`, etc.
  These aren't live, but documenting them normalizes the pattern.

### F5-3 [HIGH] Live secrets exposed via `docker inspect`
- Runtime verified: `docker inspect bjhunt-backend` `.Config.Env` contains SESSION_SECRET,
  BJHUNT_API_SECRET, LITELLM_MASTER_KEY, POSTGRES_PASSWORD, NEO4J_PASSWORD,
  RESEND_API_KEY, OLLAMA_CLOUD_API_KEY. All plaintext. Any user/process that can reach
  the Docker daemon can read them. Combined with F1-1 (socket mount), this is a
  post-compromise secret-exfiltration bomb.

Remediation: move to compose `secrets:` (mounted files, file-only ingress), or Vault.

### F5-4 [HIGH] `.env.example` describes but does not suggest secret generation for every key
- `.env.example:14-22` has comments `# REQUIRED — openssl rand -hex 32`, good.
- `.env.example:8` NEXT_PUBLIC_BACKEND_URL hardcodes a value that should only be set per-env.
- `.env.example:10-11` HCAPTCHA_SECRET, RESEND_API_KEY have no guidance.

Add comments explaining where to get each third-party key and for which environment.

### F5-5 [MEDIUM] No secret rotation plan / runbook
- No documentation on how and when to rotate `SESSION_SECRET`, `BJHUNT_API_SECRET`,
  `LITELLM_MASTER_KEY`, database passwords.

A secret rotation runbook should define: rotation cadence (60/90 days), dual-secret
window pattern (accept old + new during transition), who has authority, where it's logged.

### F5-6 [MEDIUM] `.gitleaksignore` is broader than necessary
- `.gitleaksignore:3-14` ignores `engine/skills/exploit/web/SKILL.md`,
  `engine/tests/unit/research/test_tools.py`, `CLAUDE.md`, `.mcp.json`.

File-level ignores are too broad; prefer regex-scoped allowlists with explicit
fingerprints so future real secrets in the same file still trip the scanner.

### F5-7 [MEDIUM] No pre-commit hook for secret scanning
- No `.pre-commit-config.yaml`, no husky hooks.

Add `gitleaks` + `detect-secrets` as pre-commit hooks so secrets never enter history
client-side.

---

## 6. VPS hardening (SSH read-only verified)

### F6-1 [CRITICAL] `PermitRootLogin yes` + `PasswordAuthentication yes` on live VPS
- Runtime: `sshd -T` → `permitrootlogin yes`, `passwordauthentication yes`, `port 22`.
- `/etc/ssh/sshd_config.d/60-cloudimg-settings.conf` has `PasswordAuthentication no`,
  but `50-cloud-init.conf` has `yes` and wins (first match). Net effect: password auth is ON.

Remediation (edit main `/etc/ssh/sshd_config` and all drop-ins to be consistent):
- `PermitRootLogin prohibit-password` (keep pubkey-only root), or better `no` with a
  sudo-capable user.
- `PasswordAuthentication no` (globally; publish keys before applying).
- Restart sshd and verify with `sshd -T`.

### F6-2 [HIGH] CLAUDE.md falsely claims sslh multiplex on port 443
- CLAUDE.md: "sslh : systemd, ecoute 0.0.0.0:443".
- Runtime: `systemctl status sslh` → `Unit sslh.service could not be found.`
- `ss -tlnp`: port 443 is `docker-proxy` (Caddy).

The multiplex architecture described in CLAUDE.md does not exist. SSH works on port 22
directly. If the original goal was to handle a FAI that "blocks all ports except 80/443",
then either that constraint no longer applies, or SSH access is currently broken from
that ISP (tests show SSH works from this workstation via `ssh bjhunt-vps` → port 22).
Either update CLAUDE.md or re-install sslh.

Note: CLAUDE.md also says `ssh bjhunt-vps` is `ssh -p 443` but effective ssh config on
the workstation probably uses port 22 since sslh is gone — audit your `~/.ssh/config`.

### F6-3 [HIGH] UFW allows only 22, 80, 443 — contradicts CLAUDE.md
- Runtime: `ufw status` shows 22/80/443 only.
- CLAUDE.md claims ports 22, 80, 443, 2222, 8022, 25, 587, 465, 993, 4190, 8888, 5000,
  3005, 8080, 18789, 19000:19999 are open.

Current state is actually **better** than CLAUDE.md. Update CLAUDE.md to reflect reality.
Also: with sslh removed (F6-2), port 2222 isn't needed anyway.

### F6-4 [HIGH] CLAUDE.md claims Monarx antimalware installed — it isn't
- Runtime: no `monarx` package, no systemd unit, no `/opt/monarx`.

Decide whether Monarx or an equivalent (ClamAV + AIDE + wazuh-agent) should run on the
host. For a hosted attack-tool platform, host IDS is a reasonable control.

### F6-5 [HIGH] VPS OS is Ubuntu 24.04.4 LTS, not 25.10 as CLAUDE.md says
- Runtime: `PRETTY_NAME="Ubuntu 24.04.4 LTS"`, kernel `6.8.0-107-generic`.
- CLAUDE.md: "OS : Ubuntu 25.10".

Ubuntu 24.04 LTS is standard-supported until 2029-04, with ESM to 2036-04 via Ubuntu Pro
per [Ubuntu release cycle](https://ubuntu.com/about/release-cycle). This is actually
**better** than 25.10 (interim release with 9-month support). Correct CLAUDE.md.

### F6-6 [HIGH] Pending kernel + security package updates unapplied
- `apt list --upgradable` shows `linux-image-virtual 6.8.0-107 → 6.8.0-110` (security),
  `cloud-init` (25.3), `docker-compose-plugin` (5.1.3), `rsyslog` (8.2312.0-3ubuntu9.2), `snapd`.

Reboot required after kernel upgrade. Schedule a maintenance window.

### F6-7 [HIGH] `.env` lives inside the git working tree at `/opt/bjhunt/app/.env`
- CLAUDE.md describes `/opt/bjhunt/stack/.env` and `/srv/bjhunt/` as separate.
- Runtime: `/opt/bjhunt/stack/` does **not exist**. `.env` is in the git tree with
  mode 644.

Consequences:
- `git clean -fd` would wipe it (if it wasn't git-ignored, which it is, but still brittle).
- `git pull` conflicts could stomp it if pattern matched.
- World-readable (see F1-12).

Move to `/opt/bjhunt/stack/.env` with `chmod 600`. Update compose to load with absolute
path.

### F6-8 [MEDIUM] No rate-limited SSH (fail2ban is enabled but jail set is minimal)
- Runtime: `fail2ban-client status` → 1 jail, `sshd`. OK.
- Only 3 IPs ever banned, 22 total failed attempts. Port 22 exposed to Internet + root
  login + password auth means brute force is plausible.

Add jails for `sshd-ddos`, `recidive` (long-term repeat offenders). Also lower
`maxretry` from default 5 to 3, `bantime` to 24h+ for production.

### F6-9 [MEDIUM] `LoginGraceTime 30` is short — OK; `MaxAuthTries 3` good
- `/etc/ssh/sshd_config` — both are reasonable defaults.

### F6-10 [MEDIUM] `X11Forwarding yes` on the sshd config
- Unnecessary on a headless server. Set `X11Forwarding no`.

### F6-11 [MEDIUM] No `AllowUsers` / `AllowGroups` / `AllowTcpForwarding` hardening
- Default config permits SSH from any user with an account + any TCP forwarding.

Set `AllowUsers bjhunt-admin` (create this user), `AllowTcpForwarding no` (unless VPN
usage requires it), `AllowAgentForwarding no`, `PermitTunnel no`.

### F6-12 [MEDIUM] `cloud-init` left enabled post-bootstrap
- `unattended-upgrades` lists cloud-init among upgradable. Cloud-init on a long-lived
  server is attack surface. Disable via `touch /etc/cloud/cloud-init.disabled`.

### F6-13 [LOW] `docker` group: who's in it?
- Not checked fully — if any non-root user is in the docker group, they have effective
  root on the host.

### F6-14 [LOW] No auditd
- `systemctl list-units` has no `auditd.service`. For a cybersec platform, enable auditd
  with rules for file changes to `/etc/`, docker socket, ssh keys.

### F6-15 [LOW] No AIDE / tripwire file integrity monitoring
- For hardening, run AIDE with baseline stored off-host and weekly checks.

---

## 7. Backups & Disaster Recovery

### F7-1 [CRITICAL] No Postgres backup strategy
- No `pg_basebackup`, no `pg_dump` cron, no WAL archiving, no physical replica.
- Docker volume `postgres_data` is local only. If `/var/lib/docker` fails, the DB is gone.
- No `pgbackrest`, `pgBackRest`, or `wal-g` configuration present.

For production paying users, daily logical dumps + WAL archiving to an offsite bucket is
the minimum. Hostinger offers VPS backups; confirm policy + test restore.

### F7-2 [CRITICAL] No Neo4j backup strategy
- Neo4j stores the attack chain knowledge graph. Lost data = lost research history.
- Community edition requires `neo4j-admin database backup` via cron; no such schedule.

### F7-3 [HIGH] No disaster recovery runbook
- What's the RTO? RPO? Where's the runbook for "VPS is gone"?
- Confirm Hostinger snapshot cadence via their API; today's state:
  Hostinger has weekly automated backups for VPS KVM 8 plans but check the panel.

### F7-4 [HIGH] Local `docker volume` backups not offsite
- All state lives in `postgres_data`, `redis_data`, `neo4j_data`, `caddy_data`, `workspace_data` Docker volumes on a single VPS. Single point of failure.

Add a nightly job that tarballs all volumes and pushes to an S3-compatible bucket (Backblaze B2, Hetzner Storage Box, or Hostinger Object Storage). Encrypt at rest with age or GPG.

### F7-5 [MEDIUM] No snapshot cadence automation
- Hostinger snapshots must be triggered via API. No GHA workflow or cron.

Add a monthly scheduled `mcp__hostinger-mcp__VPS_createSnapshotV1` call via a scheduled
GitHub Actions or a cron on the VPS.

### F7-6 [MEDIUM] `caddy_data` volume contains ACME state
- If this is lost, Let's Encrypt re-issues after rate-limit window (~week). Factor into DR.

---

## 8. Observability

### F8-1 [CRITICAL] No metrics / no logs / no alerting
- Runtime: no prometheus, no grafana, no loki, no promtail, no alertmanager.
- No external uptime probe mentioned anywhere.
- Caddy emits default logs to `/dev/stderr` which get captured by Docker json-file
  (rotated at 10 MB × 3).
- Backend log output is unbuffered to stdout.

For a SaaS with paying customers, observability is minimum viable. At least:
- Prometheus + node-exporter + cAdvisor + postgres-exporter + redis-exporter
- Grafana (can be the single-pane view)
- Loki for logs
- Alertmanager → email/Slack to the operator

Alternative: use a managed service (Grafana Cloud Free / BetterStack / Axiom / Baselime).

### F8-2 [HIGH] No uptime monitoring from outside the VPS
- No Pingdom/UptimeRobot/BetterStack/Checkly — if the VPS goes down, detection is
  user-reported.

Add at minimum a free UptimeRobot/BetterStack check on `https://api.bjhunt.com/api/health/live`,
`https://chat.bjhunt.com/api/health/live`, `https://bjhunt.com`. Send to operator's
phone via SMS webhook.

### F8-3 [HIGH] No log shipping / centralized logs
- `/var/log/auth.log` only rotated locally. Docker json-file logs rotate locally.
- Incident forensics post-facto are limited to what's on-disk.

### F8-4 [MEDIUM] No distributed tracing
- OpenTelemetry SDKs exist for Hono, LangGraph has built-in OTel via LangSmith.
- No OTel collector configured.

For streaming chat debugging — this would have saved hours on the SP3 bug chase.

### F8-5 [MEDIUM] No error tracking
- No Sentry, Bugsnag, Rollbar. Backend JS errors fall on the floor.

### F8-6 [MEDIUM] PII in access logs?
- `/api/auth/me` endpoints carry session cookies. Default Caddy/backend logs would
  include those if log level is verbose. Audit that session tokens are **not** written
  to any log.

### F8-7 [LOW] Healthcheck endpoints exist — good
- `/api/health/live`, `/api/health/version` are referenced in deploy-vps.yml. Used by
  both internal healthcheck and Vercel regions (per Caddy logs). Good foundation.

---

## 9. Compliance / legal / data protection

### F9-1 [CRITICAL] No `SECURITY.md`
- Missing. For a public security-focused repo, **must** exist. Define disclosure policy,
  PGP key, contact, timelines (90-day standard or attempt coord).

### F9-2 [HIGH] No `LICENSE` file
- Missing. Without a license, nothing in the repo is legally usable by anyone. Decide:
  proprietary (all rights reserved + copyright notice) or OSS (Apache-2.0, MIT, AGPL).
  Since the engine derives from Decepticon (Apache-2.0), downstream obligations apply.

### F9-3 [HIGH] No `CODE_OF_CONDUCT.md`
- Required for contributors. Use the Contributor Covenant.

### F9-4 [HIGH] No visible GDPR data-retention policy
- `app/[locale]/legal/page.tsx` has a privacy section (translations-driven), but:
  - No defined retention period for user data / engagement logs / LLM transcripts.
  - No DPA (data processing agreement) template for business customers.
  - No cookie banner / CMP. Since we're in Paris datacenter, ePrivacy directive applies.
  - No record of processing activities (ROPA) per GDPR Art. 30.

### F9-5 [HIGH] No Terms of Service / Privacy Policy pages as standalone
- Only `/legal` single page with a marketing footprint. A commercial SaaS needs:
  - `/terms` — ToS, acceptable use, offensive-sec tool usage disclaimer.
  - `/privacy` — formal privacy policy.
  - `/dpa` — data processing agreement (EU).
  - `/aup` — acceptable use policy explicitly for red-team use cases.

### F9-6 [HIGH] No user consent flow for chat inputs going to third-party LLMs
- LiteLLM proxies to Anthropic / OpenAI / Google / Ollama Cloud. Users should consent
  to their prompts leaving EU boundaries (Anthropic/OpenAI/Google route through US).
  Otherwise GDPR adequacy concerns.

### F9-7 [HIGH] Contact emails publicly exposed in code
- `app/[locale]/legal/page.tsx:27-29, 74-78` lists `contact@bjhunt.com`, `partner@bjhunt.com`.
  Normal for legal pages; ensure DMARC/DKIM/SPF locked down on `bjhunt.com` so they
  can't be spoofed into phishing.

### F9-8 [MEDIUM] No responsible disclosure / bug bounty
- For a security tool, at minimum publish a `security.txt` per [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116.html)
  at `/.well-known/security.txt` and document scope, payment (if any), in-scope domains.

### F9-9 [MEDIUM] No compliance statement / SOC2 readiness
- If targeting regulated customers, begin the compliance clock early (SOC2 Type II
  typically requires 6-12 months of evidence). Lots of F-1 and F-3 findings above would
  be auditor red flags.

### F9-10 [LOW] "Mentions légales" update date is 18/01/2026
- `app/[locale]/legal/page.tsx:79`. 3 months old. Fine for now, but tag with each policy
  change.

---

## 10. Root files / `.dockerignore` / `.gitignore`

### F10-1 [HIGH] No `.dockerignore`
- Absent from repo root; no `backend/.dockerignore` either (visible). This means
  `docker build` context includes `node_modules`, `.next`, `.git`, screenshots
  (`chat-*.png/jpeg`), `tsbuildinfo` — bloating images and leaking dev artifacts into
  the image cache.

Add at minimum:
```
.git
.github
**/node_modules
**/.next
**/dist
*.png
*.jpeg
*.log
*.tsbuildinfo
*.env*
!*.env.example
```

### F10-2 [MEDIUM] `.gitignore` ignores all png/jpg/jpeg except under `public/`
- `.gitignore:42-47`. That's fine for build artifacts, but the repo root has **40+ chat-*.png/jpeg** screenshots checked in (see `ls` output). They are **not** ignored because the ignore pattern `*.png` matches them but they were committed before the rule existed or via force-add.

Audit, remove from main branch (keep via Git LFS if truly needed for bug reports), add
explicit `!/chat-*.png` if you want to keep or remove via `git rm`.

### F10-3 [LOW] `.env` is correctly in `.gitignore`
- `.gitignore:16-19`. Good.

### F10-4 [LOW] `.playwright-mcp/` and `.playwright-cli/` ignored
- Good.

---

## 11. Cross-cutting: documentation drift

### F11-1 [HIGH] CLAUDE.md contains ≥5 factual errors about the VPS
Summary (see F6-2, F6-3, F6-4, F6-5, F6-7):
- OS version: claims 25.10, actual 24.04 LTS.
- sslh: claims active, actual absent.
- Monarx: claims installed, actual absent.
- `/opt/bjhunt/stack/`: claims to exist, actual does not exist.
- UFW port list: claims many ports, actual 22/80/443 only.

An AI agent following CLAUDE.md will make wrong decisions (e.g., "I must keep sslh working" → wastes time on nonexistent service). Rewrite the VPS section based on the runtime inspection in this audit.

### F11-2 [HIGH] CLAUDE.md architecture diagram doesn't match live Caddy config
- CLAUDE.md says `chat.bjhunt.com → langgraph:2024`, but `ops/Caddyfile:1-12` routes both
  to `backend:3001`. Either change Caddyfile to match architecture or fix CLAUDE.md.

### F11-3 [MEDIUM] CLAUDE.md 2FA deadline is wrong (27 May vs 2 May)
- See F4-1.

---

## 12. Miscellaneous

### F12-1 [HIGH] `HCAPTCHA_SECRET` referenced but no implementation visible
- `.env.example:10`: `HCAPTCHA_SECRET=`.
- No clear hCaptcha verification path in public form endpoints.

Without captcha, public beta/contact forms (which were called out as having in-memory
rate limiting, DEEP-AUDIT #25) are bot targets.

### F12-2 [MEDIUM] Docker daemon not configured with `live-restore`, `icc: false`
- `/etc/docker/daemon.json`: log driver + pools. Missing `"live-restore": true`,
  `"icc": false`, `"no-new-privileges": true` (daemon default).

`live-restore` keeps containers running during daemon upgrades. `icc: false` disables
inter-container communication on the default bridge.

### F12-3 [MEDIUM] `0.0.0.0:22` exposure vs Hostinger firewall
- CLAUDE.md "Firewall Hostinger: Port 22, 80, 443, 2222, 8022 accept".
- Runtime UFW: 22/80/443 only.

Two layers of firewall. Keep in sync. Close 2222/8022 at hyperviseur level too to
minimize surface.

### F12-4 [MEDIUM] IPv6 is enabled but UFW rules shown show `(v6)` — OK
- UFW allows 22/80/443 on v6 as well. Confirm we actually want SSH on v6 — most operators
  don't need it.

### F12-5 [LOW] Chat screenshots committed to repo root (40+ `.png/.jpeg`)
- Visible in `ls -la` of project root. Bloats repo, may leak non-essential info.

### F12-6 [LOW] No runbook for "what do I do when something breaks"
- Not urgent, but essential for weekend on-call.

### F12-7 [LOW] `package.json:7`: `vercel-build` script duplicates `build`
- Minor. Likely Vercel-required alias.

### F12-8 [LOW] `next.config.ts:22`: `X-Frame-Options: DENY` set — good
### F12-9 [LOW] `next.config.ts:23`: `X-Content-Type-Options: nosniff` set — good
### F12-10 [LOW] `next.config.ts:25`: `Permissions-Policy` set — good (but limited to camera/microphone/geolocation; add `browsing-topics=()` to opt out of Topics API)

---

## Summary counts
- CRITICAL: 8 (F1-1, F1-2, F4-1, F5-1, F6-1, F7-1, F7-2, F8-1, F9-1)
- HIGH: 39
- MEDIUM: 28
- LOW: 14
- Total: 89 findings

## Top-10 priority actions (do in this order)

1. **Rotate Hostinger API token, remove from `.mcp.json`, scrub git history** (F5-1). Publicly exposed.
2. **Enable 2FA on `bjhuntcom-oss` GitHub account** (F4-1). Deadline 2026-05-02.
3. **Opt out of Copilot training at github.com/settings/copilot/features** (F4-2). Deadline 2026-04-24.
4. **Kill Docker socket mount on `langgraph`** (F1-1). Replace with docker-socket-proxy or a sandbox daemon.
5. **Switch `langgraph dev` → production entrypoint** (F1-2). Update `engine/containers/langgraph.Dockerfile` CMD.
6. **Turn off SSH root login + password auth; disable password auth globally** (F6-1).
7. **`chmod 600 /opt/bjhunt/app/.env`, move to `/opt/bjhunt/stack/.env` outside git tree** (F1-12, F6-7).
8. **Add `cap_drop: [ALL]` and `security_opt: [no-new-privileges:true]` to every service in `docker-compose.yml`** (F1-3).
9. **Add branch protection on `main`: required PR, required status checks, signed commits, linear history** (F3-12).
10. **Set up Postgres + Neo4j backups to offsite storage; test restore** (F7-1, F7-2).

Second wave (24-48h after):
11. Remove dual-homed `neo4j` from management net; mark `bjhunt-sandbox-net` `internal: true`.
12. Add container image build workflow with cosign signing + Trivy SARIF upload + CodeQL.
13. Create `SECURITY.md`, `LICENSE`, `CODEOWNERS`, `CONTRIBUTING.md`, `/.well-known/security.txt`.
14. Stand up observability stack (Prometheus + Grafana + Loki minimum).
15. Rewrite CLAUDE.md VPS section with factual runtime state.
16. Set up Dependabot / Renovate for npm, bun, pip/uv, docker, github-actions.

---

## References
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Docker Security Best Practices 2026 - ZeonEdge](https://zeonedge.com/blog/docker-security-best-practices-2026-hardening-containers-build-runtime)
- [Docker Container Best Practices 2026 - Jishu Labs](https://jishulabs.com/blog/docker-container-best-practices-2026)
- [Docker Compose Security Best Practices](https://compose-it.top/posts/docker-compose-security-best-practices)
- [Docker Runtime Escape - docker.sock](https://opscart.com/docker-runtime-escape-why-mounting-docker-sock-is-worse-than-running-privileged-containers/)
- [Unit42 Container Escape Techniques](https://unit42.paloaltonetworks.com/container-escape-techniques/)
- [Aikido no-BS Docker checklist](https://www.aikido.dev/blog/a-no-bs-docker-security-checklist-for-the-vulnerability-minded-developer)
- [Caddy Web Server Hardening - Hackviser](https://hackviser.com/tactics/hardening/caddy)
- [Caddy Hardening: Security Headers and Rate Limiting](https://jonesrussell.github.io/blog/caddy-security-headers-rate-limiting/)
- [Caddy: How to use HSTS for proxied http server](https://caddy.community/t/how-to-use-hsts-for-proxied-http-server/5301)
- [Mandatory Github 2FA before May 2 2026](https://github.com/orgs/community/discussions/191012)
- [About mandatory two-factor authentication - GitHub Docs](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/about-mandatory-two-factor-authentication)
- [GitHub Copilot Data Training Policy Change (April 24, 2026)](https://smartscope.blog/en/generative-ai/github-copilot/github-copilot-data-training-policy-2026/)
- [Updates to GitHub Copilot interaction data usage policy](https://github.blog/news-insights/company-news/updates-to-github-copilot-interaction-data-usage-policy/)
- [Trivy vs Snyk 2026 - Aikido](https://www.aikido.dev/blog/snyk-vs-trivy)
- [Snyk vs CodeQL - Free SAST Tools Compared 2026](https://dev.to/rahulxsingh/snyk-vs-codeql-free-sast-tools-compared-2026-4bp7)
- [Snyk vs Semgrep 2026](https://dev.to/rahulxsingh/snyk-vs-semgrep-sca-platform-vs-custom-sast-rules-in-2026-3047)
- [SLSA 3 Compliance with GitHub Actions for Go](https://github.blog/security/supply-chain-security/slsa-3-compliance-with-github-actions/)
- [sigstore/cosign](https://github.com/sigstore/cosign)
- [Safeguard your containers with new container signing in GitHub Actions](https://github.blog/security/supply-chain-security/safeguard-container-signing-capability-actions/)
- [Ubuntu release cycle](https://ubuntu.com/about/release-cycle)
- [endoflife.date - Ubuntu](https://endoflife.date/ubuntu)
- [Why Your LangGraph Agents Fail in Production](https://dev.to/sai_raghavendra_c7535ddf3/why-your-langgraph-agents-fail-in-production-and-the-architecture-that-fixes-it-5fca)
- [Container Escape Vulnerabilities: AI Agent Security for 2026 - Blaxel](https://blaxel.ai/blog/container-escape)
- [RFC 9116 - security.txt](https://www.rfc-editor.org/rfc/rfc9116.html)
- [Prevent Container Escape Attacks 2026](https://oneuptime.com/blog/post/2026-03-20-prevent-container-escape-portainer/view)
