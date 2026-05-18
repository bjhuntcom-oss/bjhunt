# 13 — Dual Sandbox Architecture

> Two sandbox backends — E2B (production) and bjhunt-sandbox (reserve) — switched by a single env var.

## Executive summary

| | E2B (production) | bjhunt-sandbox (reserve) |
|---|---|---|
| **Isolation** | Firecracker microVM (KVM hardware-level) | Docker container (OS-level, shared kernel) |
| **Cost** | ~$0.50/h per chat (BYOC managed-EU) | 0 EUR (VPS resources) |
| **Scale** | Unlimited (cloud elastic) | Limited by VPS (8 vCPU / 32 GB current) |
| **Auth** | HMAC-SHA256 Bearer token (relay secret) | HMAC Bearer token (`BJHUNT_SANDBOX_SECRET`) |
| **Protocol** | MCP JSON-RPC `POST /mcp` (proxied via backend) | REST HTTP `POST /sandbox/execute` (direct) |
| **Integration** | Backend proxy → E2B SDK → MCP | Orchestrator → bjhunt-sandbox REST |
| **Status** | Active (`BJHUNT_RUNTIME_MODE=e2b`) | Deployed but disabled (VPS too weak) |
| **Activation criterion** | Immediate | After VPS upgrade (Hetzner CCX43: 16 vCPU / 64 GB) |

## Architecture diagrams

### E2B mode (production)

```
  bjhunt-app ──► bjhunt-backend ──► E2B API (api.e2b.dev)
                      │                    │
                      │ POST /api/internal │ Firecracker microVM
                      │   /execute-tool    │ Template: bjhunt-kali
                      │   (Bearer token)   │ Host: 8090-<id>.e2b.app
                      │                    │
                      │                    │  kali-mcp-server.cjs
                      │                    │    POST /mcp (JSON-RPC)
                      │                    │    Auth: HMAC-SHA256
                      │                    │    Tools: execute_command,
                      │                    │      read_file, write_file,
                      │                    │      glob_files, search_content,
                      │                    │      web_search, write_canvas
                      │                    │
                      │                    │  /chat/.relay-secret (0600)
                      │                    │  /chat/scope.json
                      │                    │  /chat/evidence/
                      ◄────────────────────┘
                        SSE events back to client
```

### bjhunt-sandbox mode (reserve)

```
  bjhunt-orchestrator ──► bjhunt-sandbox (FastAPI)
    tool_executor.py        main.py
      │                       │
      │ POST /sandbox/execute │  POST /openhands/spawn
      │   (Bearer token)      │  POST /openhands/execute
      │                       │  GET  /openhands/stream
      │                       │
      │                       │  security/
      │                       │    EnsembleSecurityAnalyzer
      │                       │      Pattern (15 blocks)
      │                       │      PolicyRail (5 rules)
      │                       │      LLM (heuristic stub)
      │                       │
      │                       │  workspace.py
      │                       │    DockerWorkspace (docker-py)
      │                       │
      │                       │  /var/run/docker.sock:ro
      │                       │
      │              ──────────┘
      │              Docker Engine
      │                Container per sandbox
      │                  Image: bjhunt-sandbox:lts
      │                  CPU: 1.0, RAM: 512 MB
      │                  pids_limit, read_only, tmpfs,
      │                  no-new-privileges
      ◄──────────────────
        {stdout, stderr, exit_code, duration_ms}
```

## Switching mechanism

Single environment variable on the orchestrator:

```
BJHUNT_RUNTIME_MODE=e2b|sandbox|openhands
```

In `tool_executor.py`, `execute_tool()` dispatches based on `RUNTIME_MODE`:

- **`e2b`** → `_execute_via_e2b()`: POST to backend `/api/internal/execute-tool` with `BJHUNT_ORCHESTRATOR_SECRET` Bearer token. Backend proxies to the E2B sandbox via its own E2B SDK.
- **`sandbox`** → `_execute_via_sandbox()`: POST to `BJHUNT_SANDBOX_URL/sandbox/execute` with `BJHUNT_SANDBOX_SECRET` Bearer token. Direct REST call.
- **`openhands`** → `_execute_via_openhands()`: future, not yet implemented.

Both paths execute scope guard validation before any command reaches the sandbox.

## Environment variables

| Variable | E2B mode | Sandbox mode |
|---|---|---|
| `BJHUNT_RUNTIME_MODE` | `e2b` | `sandbox` |
| `BJHUNT_ORCHESTRATOR_SECRET` | Required (Bearer to backend) | Required |
| `BJHUNT_SANDBOX_SECRET` | N/A | Required (Bearer to sandbox) |
| `BJHUNT_SANDBOX_URL` | N/A | `http://bjhunt-sandbox:8000` |
| `BJHUNT_BACKEND_URL` | `http://bjhunt-backend:8080` | N/A |
| `E2B_API_KEY` | Required | N/A |

## Security hardening (audit fixes 2026-05-18)

Both backends received the following fixes:

| Fix | E2B | bjhunt-sandbox |
|---|---|---|
| Auth on ALL endpoints | HMAC relay token | Bearer token on `/sandbox/*` + `/openhands/*` |
| Port binding | N/A (E2B managed) | `127.0.0.1:8000` (not `0.0.0.0`) |
| Docker socket | NOT mounted | `:ro` (needed for workspace spawn) |
| seccomp | Default profile | Default (removed `unconfined`) |
| Capabilities | `cap_drop ALL` | `NET_RAW`, `NET_ADMIN` removed |
| Resource limits | Firecracker allocation | `pids_limit`, `read_only`, `tmpfs`, `no-new-privileges` |
| Egress | `egress-filter.sh` (iptables `-A` REJECT RFC1918 first) | EnsembleSecurityAnalyzer |

## Migration plan (sandbox activation when VPS upgraded)

1. **J-7**: Verify `bjhunt-sandbox/Dockerfile` builds; test `docker-compose up` locally; validate security analyzers
2. **Jour J**: Provision Hetzner CCX43; deploy sandbox; smoke test spawn+execute
3. **J+1**: Set `BJHUNT_RUNTIME_MODE=sandbox`; update `BJHUNT_SANDBOX_URL`; connect networks
4. **J+2 to J+5**: Feature flag rollout 10%→50%→100%; monitor latency, errors, CPU/RAM
5. **Rollback**: Set `BJHUNT_RUNTIME_MODE=e2b` at any time

## Related docs

- [06 — Security](06-SECURITY.md) — sandbox isolation hardening details
- [10 — Decisions (ADR)](10-DECISIONS.md) — ADR-005 (E2B selection), ADR-006 (hosting)
- [12 — SSE Events](12-STREAMING_EVENTS.md) — `sandbox.spawned` event
- [archive/DECISION_DUAL_SANDBOX_2026-05-13.md](../archive/DECISION_DUAL_SANDBOX_2026-05-13.md) — original detailed analysis