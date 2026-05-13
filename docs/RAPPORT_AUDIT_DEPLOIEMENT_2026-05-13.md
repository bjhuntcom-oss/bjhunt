# RAPPORT D'AUDIT DEPLOIEMENT — BJHUNT 4 MAX

**Date** : 2026-05-13  
**Scope** : Architecture hybride 5 services (backend, orchestrator, sandbox, engine, frontend)  
**Auditeur** : Agent DevOps Enterprise Grade  
**Statut** : Livré — Phase 3 (openclaude sur backend host)

---

## Service : Backend (bjhunt-backend)

### Dockerfile / Image
- **Fichier** : `D:\bjhunt-backend\Dockerfile`
- **Multi-stage** : Oui — 4 stages (`engine-build`, `deps`, `build`, `runtime`). Bonne pratique.
- **Base image** : `oven/bun:1.3.13-alpine` (coherent avec `package.json` engines `bun >= 1.1.0`).
- **Non-root user** : Aucun — le runtime stage exécute en `root` (Alpine par défaut). L'engine copié dans `/opt/openclaude` et les scripts build agents tournent en root.
- **HEALTHCHECK** : Présent — `GET http://127.0.0.1:8080/api/health`, intervalle 20s, timeout 5s, start-period 15s, retries 3. **Aligné** avec la route Hono `GET /api/health`.
- **ENTRYPOINT** : `tini` (gestion PID 1 + signal forwarding) -> `bun run src/index.ts`.
- **Taille estimée** : Maîtrisée grâce au multi-stage et `--production`.
- **Secrets en dur** : Aucun dans le Dockerfile. Tout passe par env vars au runtime.
- **Pack engine** : Le build copie le dist openclaude + pack bjhunt (38 personas, hooks, IDENTITY.md). Cohérent avec l'architecture Phase 3.
- **drizzle** : `drizzle.config.ts` présent au runtime, mais `package.json` ne fournit pas de script `db:migrate` appelé au boot (voir Gaps).

### Ports exposés
| Service | Port interne | Port externe | Binding |
|---|---|---|---|
| backend | 8080 | 8080 | `0.0.0.0:8080` (par défaut Hono) |

### Env vars
| Variable | Définie dans | Consommée par | Aligné? |
|---|---|---|---|
| PORT | `.env` / env var | `src/env.ts` (default 8080) | 🟢 Oui |
| POSTGRES_URL | `.env` / env var | `src/env.ts`, `src/lib/db.ts` | 🟢 Oui |
| REDIS_URL | `.env` / env var | `src/env.ts`, `src/lib/redis.ts` | 🟢 Oui |
| LITELLM_URL | `.env` / env var | `src/env.ts` | 🟢 Oui |
| JWT_SECRET_TICKET | `.env` / env var | `src/env.ts` | 🟢 Oui |
| BETTERAUTH_SECRET | `.env` / env var | `src/env.ts` | 🟢 Oui |
| BJHUNT_SECRET_MASTER_KEY | `.env` / env var | `src/env.ts` (optional) | 🟢 Oui |
| BJHUNT_RELAY_SECRET | `.env` / env var | `src/env.ts`, `src/lib/relay-token.ts`, `src/lib/e2b.ts` | 🟢 Oui |
| BJHUNT_OPENCLAUDE_BIN | `.env` / env var | `src/env.ts` (default `/opt/openclaude/dist/cli.mjs`) | 🟢 Oui |
| BJHUNT_CHATS_DIR | `.env` / env var | `src/env.ts` (default `/data/bjhunt-chats`) | 🟢 Oui |
| E2B_API_KEY | `.env` / env var | `src/env.ts` (optional) | 🟢 Oui |
| BJHUNT_E2B_MODE | `.env` / env var | `src/env.ts` (default `e2b`) | 🟢 Oui |
| BJHUNT_ENGINE_MODE | `.env` / env var | `src/env.ts` (default `openclaude`) | 🟢 Oui |
| BJHUNT_ORCHESTRATOR_URL | `.env` / env var | `src/env.ts` (default `http://bjhunt-orchestrator:8000`) | 🟢 Oui |
| R2_* | `.env` / env var | `src/env.ts` (optionnel) | 🟢 Oui |
| SENTRY_DSN_BACKEND | `.env` / env var | `src/env.ts` (optionnel) | 🟢 Oui |

### Networking
- Le backend est censé joindre l'orchestrator via `BJHUNT_ORCHESTRATOR_URL=http://bjhunt-orchestrator:8000` (nom DNS Docker).
- **Problème** : Il n'existe **aucun** `docker-compose.yml` global qui crée un réseau partagé nommant le service `bjhunt-orchestrator`. Le backend et l'orchestrator ne peuvent donc pas se résoudre mutuellement par nom de service Docker si chacun est lancé isolément.
- Le backend est censé parler au sandbox Kali via E2B (port 8090 public E2B) ou Docker local (`BJHUNT_E2B_MODE=docker`). En mode `docker`, le backend crée dynamiquement des conteneurs `bjhunt-kali:latest` — cela fonctionne si Docker socket est monté ou si l'engine tourne en local.

### Gaps
- [ ] **ROOT_RUNTIME** : Le Dockerfile backend ne crée pas d'utilisateur non-root (`USER ...`). Le process Bun + openclaude tournent en root dans l'image Alpine. 🟡
- [ ] **NO_GLOBAL_DOCKER_COMPOSE** : Aucun `docker-compose.yml` racine (ni dans `bjhunt-v2/` ni dans `bjhunt-backend/`) ne définit le backend comme service Docker avec ses dépendances (Postgres, Redis). 🟡
- [ ] **MIGRATION_AT_BOOT** : Aucune commande `bun run db:migrate` n'est lancée dans le `CMD` ou un script d'entrypoint. En production, cela impose une étape manuelle ou un job init-container. 🟡

### SEVERITÉ : 🟡

---

## Service : Orchestrator (bjhunt-orchestrator)

### Dockerfile / Image
- **Fichier** : `D:\bjhunt-orchestrator\orchestrator\Dockerfile`
- **Multi-stage** : Oui (`builder` -> production stage). Bonne pratique.
- **Base image** : `python:3.12-slim`.
- **Non-root user** : Aucun — copie les assets dans `/root/.local` et le `WORKDIR` est `/app`. Le conteneur tourne en root.
- **HEALTHCHECK** : **ABSENT** dans le Dockerfile. Or le endpoint applicatif est `POST /health` (`main.py` line 52). Un HEALTHCHECK Docker par défaut fait un GET — il y a donc une **double incohérence** (absence de HEALTHCHECK + méthode POST non compatible avec Docker). 🔴
- **Start script** : `CMD ["./start.sh"]`.
- **Permissions start.sh** : Le fichier `start.sh` sur le filesystem host Windows n'a pas le bit exécutable Unix. Le `Dockerfile` ne fait pas de `RUN chmod +x start.sh`. Selon les versions de Docker Desktop/BuildKit sur Windows, `COPY` peut ne **pas** conserver un mode exécutable inexistant, ce qui provoque un `permission denied` au boot du conteneur. 🔴

### Ports exposés
| Service | Port interne | Port externe | Binding |
|---|---|---|---|
| orchestrator | 8000 | 8000 (Dockerfile EXPOSE) | `0.0.0.0:8000` (uvicorn) |

### Env vars
| Variable | Définie dans | Consommée par | Aligné? |
|---|---|---|---|
| PORT | `.env` (default 8000) | `main.py` (line 221) | 🟢 Oui |
| CHECKPOINT_POSTGRES_URI | `.env` | `.env.example`, `checkpointer.py` | 🟢 Oui (mais nom différent de `POSTGRES_URL`) |
| BJHUNT_SANDBOX_URL | `.env` | `.env.example` (`http://bjhunt-sandbox:8080`), `nodes/tool_executor.py` (`http://bjhunt-sandbox:8080`) | 🔴 **NON** — le sandbox n'écoute pas sur 8080 (voir ci-dessous) |
| ANTHROPIC_API_KEY | `.env` | `.env.example` | 🟢 Oui |
| LITELLM_* | `.env` | `.env.example` | 🟢 Oui |

### Networking
- L'orchestrator attend le sandbox à `BJHUNT_SANDBOX_URL=http://bjhunt-sandbox:8080`.
- **Problème critique** : Le sandbox Kali (Phase 3) expose le port **8090** (`BJHUNT_MCP_PORT=8090` dans `bjhunt-kali.Dockerfile`). Le sandbox OpenHands (legacy `bjhunt-sandbox/sandbox/docker-compose.yml`) expose le port **8000**. Aucun des deux n'écoute sur **8080**.
- L'orchestrator ne trouvera donc jamais le sandbox si la variable reste à sa valeur par défaut. 🔴
- Pas de `docker-compose.yml` au niveau orchestrator : le conteneur est isolé et doit rejoindre manuellement un réseau Docker pour voir `bjhunt-sandbox` par nom DNS.

### Gaps
- [ ] **HEALTHCHECK_MISSING** : Pas de HEALTHCHECK dans le Dockerfile. 🔴
- [ ] **HEALTH_METHOD_MISMATCH** : Endpoint `POST /health` (FastAPI) vs convention Docker `GET`. Le HEALTHCHECK, s'il était ajouté, devrait faire `CMD curl -fsS -X POST ...` ou changer la route en `GET`. 🔴
- [ ] **START_SH_NOT_EXECUTABLE** : `start.sh` non `chmod +x` dans le Dockerfile. 🔴
- [ ] **PORT_SANDBOX_MISMATCH** : `BJHUNT_SANDBOX_URL` pointe vers `:8080` alors que le sandbox est sur `:8090` (Kali) ou `:8000` (OpenHands). 🔴

### SEVERITÉ : 🔴

---

## Service : Sandbox (bjhunt-sandbox)

### Dockerfile / Image
- **Fichier** : `D:\bjhunt-sandbox\sandbox\Dockerfile`
- **Multi-stage** : Non — image monolithique `kalilinux/kali-rolling:latest`.
- **Base image** : `kalilinux/kali-rolling:latest` (rolling, donc non reproductible à l'identique sans tag figé en dehors du nom d'image).
- **Non-root user** : Aucun — tout tourne en root.
- **HEALTHCHECK** : **ABSENT** dans le Dockerfile.
- **Port exposé** : `EXPOSE 8000` (legacy OpenHands FastAPI), mais le `docker-compose.yml` du même dossier mappe aussi `8000:8000`.

### Ports exposés
| Service | Port interne | Port externe | Binding |
|---|---|---|---|
| sandbox (OpenHands legacy) | 8000 | 8000 | `0.0.0.0:8000` |
| sandbox (Kali MCP Phase 3) | 8090 | 8090 (E2B forward only) | `0.0.0.0:8090` |

### docker-compose.yml
- **Fichier** : `D:\bjhunt-sandbox\sandbox\docker-compose.yml`
- Déploie le service `sandbox` sur le port `8000:8000`.
- Réseau isolé `bjhunt-sandbox-net` (bridge). Ce réseau est **différent** du `bjhunt-net` mentionné dans `deploy.sh`.
- Monte `/var/run/docker.sock` (le sandbox peut créer des conteneurs enfants).
- Volume nommé `bjhunt-sandbox-volumes` pour `/tmp/bjhunt-sandbox-volumes`.
- **`seccomp:unconfined`** + `cap_add: [NET_RAW, NET_ADMIN]` — nécessaire pour les outils réseau (nmap masscan) mais élargit la surface d'attaque si le conteneur est compromis.

### Env vars
| Variable | Définie dans | Consommée par | Aligné? |
|---|---|---|---|
| PORT | `docker-compose.yml`, `.env.example` | `config.py` (default 8000) | 🟢 Oui |
| HOST | `docker-compose.yml` | `config.py` | 🟢 Oui |
| SANDBOX_IMAGE | `docker-compose.yml` | `config.py` | 🟢 Oui |
| SANDBOX_NETWORK | `docker-compose.yml` | `config.py` | 🟢 Oui |
| SANDBOX_MEMORY_LIMIT | `docker-compose.yml` | `config.py` | 🟢 Oui |
| SANDBOX_CPU_LIMIT | `docker-compose.yml` | `config.py` | 🟢 Oui |
| DEFAULT_COMMAND_TIMEOUT | `docker-compose.yml` | `config.py` | 🟢 Oui |
| BJHUNT_MODE | `.env.example` | `config.py` | 🟢 Oui |

### Networking
- Le sandbox OpenHands expose `/health` en `POST` (line 86 `main.py`).
- Le sandbox Kali MCP expose `/healthz` en `GET` (line 518 `kali-mcp-server.cjs`).
- L'orchestrator (`tool_executor.py`) tente d'appeler `http://bjhunt-sandbox:8080` — ce port/service n'existe pas. 🔴

### Gaps
- [ ] **TWO_SANDBOX_IMAGES** : Il existe deux images sandbox (OpenHands `bjhunt-sandbox:latest` dans `bjhunt-sandbox/` et Kali `bjhunt-kali:latest` dans `bjhunt-engine/bjhunt/docker/`). Le `deploy.sh` ne build que la première, alors que l'architecture Phase 3 privilégie la seconde via E2B ou `BJHUNT_E2B_MODE=docker`. 🟡
- [ ] **PORT_COLLISION** : Le deploy.sh expose le sandbox sur `8001:8000` alors que le `docker-compose.yml` du sandbox mappe `8000:8000`. Collision potentielle sur le port externe 8000 si les deux sont lancées sur le même hôte. 🔴
- [ ] **HEALTHCHECK_MISSING** : Aucun HEALTHCHECK sur le Dockerfile OpenHands. 🟡

### SEVERITÉ : 🔴

---

## Service : Frontend (bjhunt-app)

### Dockerfile / Image
- **Pas de Dockerfile** — déploiement Vercel (serverless). Cohérent avec la stack Next.js 16.

### Ports exposés
| Service | Port interne | Port externe | Binding |
|---|---|---|---|
| frontend (dev) | 3000 | 3000 | `localhost:3000` |
| frontend (prod) | — | 443 | Vercel Edge |

### Env vars
| Variable | Définie dans | Consommée par | Aligné? |
|---|---|---|---|
| NEXT_PUBLIC_API_BASE | `.env.example` | `next.config.ts` rewrites | 🟢 Oui |
| NEXT_PUBLIC_APP_URL | `.env.example` | — | 🟢 Oui |

### Networking
- `next.config.ts` rewrite `/api/:path*` vers `${backend}/api/:path*`.
- **Fail-fast en production** : si `NEXT_PUBLIC_API_BASE` est absent en `production`, le build lève une `Error` (line 16-19). C'est une excellente pratique.
- Headers de sécurité (HSTS, CSP-like via Permissions-Policy, nosniff, etc.) bien configurés.

### Gaps
- Aucun gap critique détecté pour le périmètre déploiement.

### SEVERITÉ : 🟢

---

## Service : Engine (bjhunt-engine)

### Dockerfile / Image
- **Fichier** : `D:\bjhunt-engine\Dockerfile`
- **Multi-stage** : Oui (build -> runtime avec `node:22-slim`).
- **Non-root user** : Oui — `USER node` dans le runtime stage. 🟢
- **HEALTHCHECK** : Absent dans ce Dockerfile, mais ce n'est pas critique car l'engine est exécuté comme **binaire enfant** du backend (`/opt/openclaude/dist/cli.mjs`) ou buildé dans l'image backend. Il ne tourne pas comme service découvert indépendant.
- **Taille** : `git` + `ripgrep` installés en runtime (léger).

### bjhunt-kali.Dockerfile
- **Fichier** : `D:\bjhunt-engine\bjhunt\docker\bjhunt-kali.Dockerfile`
- **Multi-stage** : Non (image Kali monolithique avec outils pentest).
- **Non-root user** : Oui — `USER 1000:1000`. 🟢
- **HEALTHCHECK** : Présent — `GET http://127.0.0.1:8090/healthz`. 🟢
- **Port** : `EXPOSE 8090`. 🟢
- **Sécurité** : `tini` comme PID 1, egress-filter.sh au boot, `BJHUNT_RELAY_SECRET` vérifié par HMAC dans `kali-mcp-server.cjs`.
- **Dos2unix** : Appliqué au build sur tous les `.sh/.cjs/.js/.mjs` — bonne pratique défensive contre Windows CRLF.

### run-engagement.sh
- **Fichier** : `D:\bjhunt-engine\bjhunt\docker\run-engagement.sh`
- Gère le scope JSON, lance l'egress-filter (soft-fail si pas de CAP_NET_ADMIN), puis lance le MCP server.
- Note dans le script : "we no longer fail-close on missing BJHUNT_RELAY_SECRET here" car E2B boot la template avant les envOverrides. L'auth reste gérée au runtime par `kali-mcp-server.cjs` (refuse les calls sans token valide). C'est acceptable.

### event-relay.cjs
- **Fichier** : `D:\bjhunt-engine\bjhunt\docker\event-relay.cjs` — **ABSENT** (documenté comme remplacé par `kali-mcp-server.cjs`).

### Gaps
- [ ] **KALI_IMAGE_SIZE** : `kalilinux/kali-rolling:latest` + installations massives (hashcat, john, nuclei templates) rend l'image très lourde (plusieurs GB). E2B template build est long. Hors scope critique pour l'audit déploiement mais à noter pour les CI minutes. 🟡
- [ ] **NO_VERSION_PIN_KALI_BASE** : `FROM kalilinux/kali-rolling:latest` sans digest SHA256. Le build est non reproductible en cas de mise à jour majeure du tag `latest`. 🟡

### SEVERITÉ : 🟢

---

## Service : VPS / Ops

### deploy.sh
- **Fichier** : `D:\bjhunt-v2\ops\deploy.sh`
- **Problème majeur** : Ce script est **obsolète** par rapport à l'architecture Phase 3 documentée. Il décrit un déploiement hybride Docker + process natifs (Python venv + Bun natif) sans orchestration Docker Compose unifiée. 🔴
- Les commandes `docker-compose up -d postgres redis` supposent un `docker-compose.yml` dans le répertoire `ops/` qui **n'existe pas**.
- Le backend est lancé avec `bun run src/index.ts &` (tâche de fond) au lieu d'un conteneur Docker. Aucune supervision (restart automatique, HEALTHCHECK). 🔴
- L'orchestrator est lancé sur le port **8002** (`uvicorn ... --port 8002`) alors que son Dockerfile expose **8000**. C'est une incohérence de port. 🔴
- Le sandbox est lancé sur le port **8001** (`-p 8001:8000`) alors que son `docker-compose.yml` mappe `8000:8000`. Collision potentielle. 🔴
- Le script ne se connecte à aucun réseau Docker partagé (`bjhunt-net` est mentionné sans être créé). 🔴
- Le script écrit `DATABASE_URL` dans `.env` de l'orchestrator, mais le backend attend `POSTGRES_URL` (et `POSTGRES_URL_ADMIN`). Incohérence de nommage. 🔴
- Aucune étape de migration n'est lancée (ni `bun run db:migrate` pour le backend, ni `python checkpointer.py` n'est appelé de manière robuste avant le démarrage de l'orchestrator). 🟡

### CI/CD (GitHub Actions)
- **Fichier** : `D:\bjhunt-v2\.github\workflows\ci.yml`
- Ne concerne que le frontend (`bun install`, `typecheck`, `build`, `gitleaks`).
- **Ne build pas** les images Docker du backend, de l'orchestrator, ni du sandbox. 🟡
- **Ne push pas** vers un registry Docker. 🟡
- **Gitleaks** est bien présent en security scan. 🟢

### Wireguard / Cloudflare
- `setup-wireguard-hostinger.sh` : Idempotent, gère les clés, iptables NAT/PREROUTING pour Postgres/Redis/LiteLLM. Bonne qualité. 🟢
- `setup-cloudflared-coolify.sh` : Idempotent, gestion systemd propre. 🟢
- `wireguard.md` : Documentation claire du mesh `10.7.0.0/24`. Les IPs internes sont documentées (10.7.0.1 pour le VPS). 🟢

### Secrets
- **Fichier** : `D:\bjhunt-v2\.env.local`
- Contient des secrets en dur sur le disque local (E2B_API_KEY, Fly token, Cloudflare tokens, R2 credentials, PostgreSQL password, Redis password, Sentry DSN). 🔴
- Bien que `.env.local` soit `.gitignore` (probablement), la présence de secrets en clair sur le filesystem de l'agent est un risque opérationnel (exfiltration, backups non chiffrées).
- Le fichier **n'est pas** référencé par les Dockerfiles (ils ne font pas de `COPY .env.local`). C'est correct.

### Gaps
- [ ] **DEPLOY_SH_BROKEN** : Le script de déploiement est non fonctionnel en l'état. Il doit être entièrement réécrit avec un `docker-compose.yml` racine unifié. 🔴
- [ ] **NO_CD_PIPELINE** : Pas de workflow GitHub Actions pour le build/push des images Docker backend/orchestrator/sandbox. 🟡
- [ ] **DATABASE_URL_NAMING** : `DATABASE_URL` dans `deploy.sh` vs `POSTGRES_URL` dans le backend. Cohérence de nommage requise. 🔴

### SEVERITÉ : 🔴

---

## Synthèse cross-service

### Matrice de ports
| Service | Port réel | Port annoncé (Dockerfile) | Port dans deploy.sh | Risque |
|---|---|---|---|---|
| Backend | 8080 | 8080 | 8080 | 🟢 Aligné |
| Orchestrator | 8000 | 8000 | **8002** | 🔴 Désaligné |
| Sandbox (OpenHands) | 8000 | 8000 | **8001** (externe) | 🔴 Désaligné |
| Sandbox (Kali MCP) | **8090** | 8090 | Non géré par deploy.sh | 🔴 Invisible |
| Frontend | 3000 | — | — | 🟢 Pas de collision |

### Matrice de networking inter-services
| Source | Cible | URL/Port configuré | Accessible? | Observation |
|---|---|---|---|---|
| Backend | Orchestrator | `http://bjhunt-orchestrator:8000` | 🔴 **Non** (pas de network Docker partagé) | Le nom DNS n'existe que dans un docker-compose global inexistant. |
| Backend | Sandbox (E2B) | URL public E2B + port forward | 🟢 Oui | Via SDK E2B + `BJHUNT_RELAY_SECRET`. |
| Backend | Sandbox (Docker local) | Image `bjhunt-kali:latest` | 🟢 Oui (si mode docker) | `BJHUNT_E2B_MODE=docker` + spawn via Docker SDK. |
| Orchestrator | Sandbox | `http://bjhunt-sandbox:8080` | 🔴 **Non** | Port 8080 n'existe sur aucun sandbox. Devrait être `8090` (Kali) ou `8000` (OpenHands). |
| Frontend | Backend | `NEXT_PUBLIC_API_BASE` -> rewrite | 🟢 Oui | Configuration correcte. |

### Matrice Healthcheck
| Service | Méthode HTTP | Endpoint | HEALTHCHECK Dockerfile | Aligné? |
|---|---|---|---|---|
| Backend | GET | `/api/health` | Oui (GET) | 🟢 Oui |
| Orchestrator | POST | `/health` | **Absent** | 🔴 **NON** — méthode POST incompatible avec `HEALTHCHECK` Docker par défaut. |
| Sandbox (OpenHands) | POST | `/health` | **Absent** | 🟡 **NON** — pas critique car pas d'orchestration HA dépendante. |
| Sandbox (Kali MCP) | GET | `/healthz` | Oui (GET) | 🟢 Oui |

### Variables d'environnement manquantes / orphelines
| Variable | Attendue par | Passée à | Statut |
|---|---|---|---|
| BJHUNT_ORCHESTRATOR_URL | Backend | — | 🟢 Définie dans env.ts, mais le service cible n'est pas joignable. |
| BJHUNT_SANDBOX_URL | Orchestrator | `http://bjhunt-sandbox:8080` | 🔴 Port faux (8080 au lieu de 8090/8000). |
| POSTGRES_URL_ADMIN | Backend env.ts | — | 🟡 Optionnelle en dev, mais obligatoire en prod pour les migrations RLS-FORCE. |
| BJHUNT_RELAY_SECRET | Backend, Sandbox Kali | — | 🟢 Alignée par contrat HMAC. |
| BJHUNT_E2B_MODE | Backend | — | 🟢 3 modes supportés (`e2b`, `docker`, `mock`). |

---

# RESUME EXECUTIF — TOP 5 RISQUES OPERATIONNELS

## 1. 🔴 `deploy.sh` est brisé et obsolète (Risque : INTERRUPTION DE SERVICE)
Le script de déploiement production ne reflète pas l'architecture Phase 3. Il manque le `docker-compose.yml` racine, il lance les services en tâches de fond Unix (`&`) sans supervision, utilise des ports contradictoires (8002 vs 8000), et ne connecte pas les services sur un réseau Docker partagé. **Un déploiement exécuté avec ce script rendrait la plateforme inopérante.**

**Action immédiate** : Rédiger un `docker-compose.yml` racine unifié (backend, orchestrator, postgres, redis, sandbox) et remplacer `deploy.sh` par `docker compose up -d`.

## 2. 🔴 L'Orchestrator ne peut jamais joindre le Sandbox (Risque : FAIL-CLOSED / ORPHELIN)
`BJHUNT_SANDBOX_URL` dans l'orchestrator pointe vers `:8080`, alors que le sandbox Kali écoute sur `:8090` et le sandbox legacy sur `:8000`. Les runs LangGraph tomberont en timeout ou erreur réseau dès le premier appel à l'executor.

**Action immédiate** : Corriger `.env.example` et `tool_executor.py` pour utiliser `http://bjhunt-sandbox:8090` (si Kali MCP) ou `http://bjhunt-sandbox:8000` (si OpenHands), selon l'architecture ciblée.

## 3. 🔴 Pas de HEALTHCHECK sur l'Orchestrator + Méthode POST (Risque : NON-DETECTION)
L'orchestrator FastAPI expose `/health` en `POST`. Un HEALTHCHECK Docker ne fonctionnera pas sans `curl -X POST` explicite. En l'absence totale de HEALTHCHECK dans le Dockerfile, Docker / l'orchestrateur d'infrastructure ne détectera pas un orchestrator bloqué ou OOM, et continuera à router du trafic vers un conteneur mort.

**Action immédiate** : Ajouter `HEALTHCHECK --interval=20s --timeout=5s CMD curl -fsS -X POST http://127.0.0.1:8000/health || exit 1` dans le Dockerfile, ou mieux, migrer `/health` vers `GET`.

## 4. 🔴 Incohérence totale des réseaux Docker (Risque : ARCHITECTURE HYBRIDE INOPÉRANTE)
Le backend attend `bjhunt-orchestrator` comme hostname DNS, et l'orchestrator attend `bjhunt-sandbox`. Aucun `docker-compose.yml` global ne crée ces hostnames. Les réseaux existants (`bjhunt-sandbox-net`) sont isolés et ne sont pas attachés aux autres conteneurs. Le backend et l'orchestrator sont donc muets l'un envers l'autre si lancés via Docker.

**Action immédiate** : Créer un `docker-compose.yml` à la racine de `bjhunt-v2` (ou `bjhunt-backend`) définissant un réseau `bjhunt-net` partagé avec les alias de service corrects.

## 5. 🔴 `start.sh` non exécutable dans l'image Orchestrator (Risque : BOOT LOOP)
Le `Dockerfile` orchestrator fait un `COPY . .` puis `CMD ["./start.sh"]`. Le fichier source `start.sh` n'a pas de permission Unix exécutable (fichier Windows), et le Dockerfile ne fait pas de `RUN chmod +x start.sh`. Si Docker BuildKit ne conjecture pas le mode (comportement incertain sous Windows host), le conteneur plante immédiatement au démarrage avec `permission denied`.

**Action immédiate** : Ajouter `RUN chmod +x start.sh` dans le Dockerfile orchestrator.

---

## Annexe — Fichiers manquants vs demande initiale

| Fichier demandé | Chemin réel | Statut |
|---|---|---|
| `bjhunt-backend/docker-compose.yml` | Absent | 🟡 Non fourni |
| `bjhunt-backend/.dockerignore` | Absent | 🟡 Non fourni |
| `bjhunt-orchestrator/docker-compose.yml` | Absent | 🟡 Non fourni |
| `bjhunt-sandbox/Dockerfile` | `D:\bjhunt-sandbox\sandbox\Dockerfile` | 🟡 Chemin décalé |
| `bjhunt-sandbox/docker-compose.yml` | `D:\bjhunt-sandbox\sandbox\docker-compose.yml` | 🟡 Chemin décalé |
| `bjhunt-sandbox/requirements.txt` | `D:\bjhunt-sandbox\sandbox\requirements.txt` | 🟡 Chemin décalé |
| `bjhunt-sandbox/.env.example` | `D:\bjhunt-sandbox\sandbox\.env.example` | 🟡 Chemin décalé |
| `bjhunt-engine/bjhunt/docker/event-relay.cjs` | Absent (remplacé par `kali-mcp-server.cjs`) | 🟢 Documenté |
| `bjhunt-engine/bjhunt/docker/run-engagement.sh` | `D:\bjhunt-engine\bjhunt\docker\run-engagement.sh` | 🟢 Présent |
| `ops/deploy.sh` | `D:\bjhunt-v2\ops\deploy.sh` | 🟢 Présent |
| `docs/infra/*.md` | `D:\bjhunt-v2\docs\infra\wireguard.md`, `cloudflare-tunnel.md` | 🟢 Présents |
| `backend/scripts/setup-*.sh` | `D:\bjhunt-v2\scripts\setup-wireguard-hostinger.sh`, `setup-cloudflared-coolify.sh` | 🟢 Présents (chemin racine, pas backend) |

---
*Fin du rapport*
