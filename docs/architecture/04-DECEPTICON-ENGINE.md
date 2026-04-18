# 04 — Decepticon Engine

> Audit exhaustif du repo PurpleAILAB/Decepticon. Tous les agents, tous les outils,
> toute la config, tous les schemas, toutes les vulnerabilites.
> Source : audit GitHub repo + code dans `engine/`

## Repository

- **GitHub** : https://github.com/PurpleAILAB/Decepticon
- **License** : Apache-2.0
- **Stack** : Python 3.13, LangGraph, LangChain, deepagents
- **API** : LangGraph Platform Server, port 2024
- **Rename** : Le repo a ete rebrand "BJHUNT" dans le README (badges, URLs)

## Les 17 agents — Specification complete

### Orchestrateurs (2)

| Agent | Model (eco) | Recursion | Bash | Sous-agents |
|---|---|---|---|---|
| **Decepticon** | GLM-5.1 → Opus 4.6 (fallback) | 200 | Oui | 9 : soundwave, recon, exploit, analyst, reverser, contract_auditor, cloud_hunter, ad_operator, postexploit |
| **VulnResearch** | GLM-5.1 → DeepSeek-v3.2 | 250 | Non | 5 : scanner, detector, verifier, patcher, exploiter |

### Agents principaux (9)

| Agent | Role | Model (eco) | Recursion | Bash | Outils uniques |
|---|---|---|---|---|---|
| **Soundwave** | Engagement planning (RoE, CONOPS, Deconfliction) | Kimi-k2.5 → GLM-5.1 | 200 | Non | Filesystem only |
| **Recon** | OSINT, enumeration, scanning | GLM-5.1 → Haiku 4.5 | 200 | Oui | 9 KG ingesters (nmap, nuclei, subfinder, httpx, dnsx, katana, masscan, ffuf, testssl) + oneliner_search + killchain_lookup |
| **Exploit** | SQLi, SSTI, Kerberoasting, creds | GLM-5.1 → Sonnet 4.6 | 200 | Oui | cve_lookup + cve_poc_lookup + payload_search + methodology_lookup |
| **PostExploit** | Privesc, lateral movement, C2 | GLM-5.1 → Sonnet 4.6 | 200 | Oui | kg_ingest_crackmapexec + kg_ingest_asrep_hashes + killchain_lookup |
| **Analyst** | Code review, static analysis, CVE, fuzzing | GLM-5.1 → DeepSeek-v3.2 | 250 | Oui | 33 RESEARCH_TOOLS + 15 REFERENCES_TOOLS |
| **Reverser** | ELF/PE/firmware, ROP gadgets, Ghidra | GLM-5.1 → DeepSeek-v3.2 | 250 | Oui | 7 REVERSING_TOOLS + kg_triage_binary |
| **Contract Auditor** | Solidity/EVM, reentrancy, flash loans | GLM-5.1 → DeepSeek-v3.2 | 250 | Oui | 6 CONTRACT_TOOLS + kg_ingest_sarif |
| **Cloud Hunter** | AWS IAM, S3, K8s, Terraform | GLM-5.1 → DeepSeek-v3.2 | 250 | Oui | 6 CLOUD_TOOLS |
| **AD Operator** | BloodHound, Kerberoast, DCSync, ADCS | GLM-5.1 → DeepSeek-v3.2 | 250 | Oui | 5 AD_TOOLS + kg_ingest_crackmapexec + kg_ingest_asrep_hashes |

### Pipeline VulnResearch (5)

| Agent | Stage | Model (eco) | Recursion | Bash | Purpose |
|---|---|---|---|---|---|
| **Scanner** | 1 | Kimi-k2.5 → GLM-5.1 | 60 | Oui | Sweep codebase, emettre CANDIDATE nodes. Cheap, rapide |
| **Detector** | 2 | GLM-5.1 → DeepSeek-v3.2 | 120 | **Non** | Lire le code autour des CANDIDATEs, promouvoir en VULNERABILITY ou rejeter |
| **Verifier** | 3 | GLM-5.1 → DeepSeek-v3.2 | 150 | Oui | Craft PoCs, run en sandbox, promouvoir en FINDING (ZFP = zero false positive) |
| **Patcher** | 4 | GLM-5.1 → DeepSeek-v3.2 | 200 | Oui | Ecrire diffs minimaux, appliquer, verifier via patch_verify |
| **Exploiter** | 5 | GLM-5.1 → DeepSeek-v3.2 | 250 | Oui | Chainer les primitives en attack paths weaponizes |

### Agent defensif (1)

| Agent | Model (eco) | Recursion | Outils |
|---|---|---|---|
| **Defender** | GLM-5.1 → Kimi-k2.5 | 150 | defense_read_brief, defense_execute_action, defense_log_action, defense_verify_status + kg_query/neighbors/stats + bash |

## Inventaire complet des outils (100+)

### Bash Tool (`tools/bash/bash.py`)

Le plus critique — execute des commandes dans des sessions tmux persistantes dans le sandbox Docker Kali :

- **Multi-tier output** : inline (≤15K chars), offload to file (15K-100K), size watchdog kill (>5M)
- **ANSI stripping**, compression de lignes repetitives, sanitization
- **Background mode**, input interactif (`is_input=True`), sessions nommees pour execution parallele
- **Auto-background** apres 60s, detection de stall pour prompts interactifs (3s)
- **Interpretation semantique** des exit codes

### Knowledge Graph Tools (33 RESEARCH_TOOLS)

**Core CRUD** :
- `kg_add_node`, `kg_add_edge`, `kg_query`, `kg_neighbors`, `kg_stats`, `kg_backend_health`

**Ingesters (output d'outils Kali)** :
- `kg_ingest_nmap_xml`, `kg_ingest_nuclei_jsonl`, `kg_ingest_subfinder`, `kg_ingest_httpx_jsonl`
- `kg_ingest_dnsx`, `kg_ingest_katana`, `kg_ingest_masscan`, `kg_ingest_ffuf`, `kg_ingest_testssl`
- `kg_ingest_crackmapexec`, `kg_ingest_asrep_hashes`, `kg_ingest_sarif`

**Analyse web/auth** :
- `kg_analyze_jwt`, `kg_analyze_oauth_callback`, `kg_analyze_cookie_value`

**Smart contracts** :
- `kg_scan_solidity`, `kg_ingest_slither`

**Binaire** : `kg_triage_binary`

**CVE intelligence** :
- `cve_lookup` (NVD + EPSS + KEV), `cve_by_package` (OSV), `cve_enrich_dependencies`

**Chain planning** :
- `plan_attack_chains` (Dijkstra multi-hop depuis ENTRYPOINT vers CROWN_JEWEL)
- `suggest_objectives_from_chains`

**Fuzzing** :
- `fuzz_classify`, `fuzz_harness` (8 engines), `fuzz_record_crash`

**Validation** : `validate_finding` (ZFP PoC runner avec negative control)

**Patching** : `patch_propose`, `patch_verify`

**Scanner** : outils de scan shard codebase

### References Tools (15 REFERENCES_TOOLS)

- `ref_list`, `ref_suggest`, `ref_topic`, `ref_fetch`, `ref_status`, `ref_grep`
- `payload_search`, `payload_classes` (bundled + PayloadsAllTheThings)
- `cve_poc_lookup` (trickest-cve + penetration-testing-poc indexes)
- `h1_search` (corpus HackerOne disclosed reports)
- `oneliner_search` (the-book-of-secret-knowledge)
- `killchain_lookup`, `killchain_suggest` (catalogue d'outils par phase kill chain)
- `methodology_lookup` (AllAboutBugBounty chapters)
- `references_hydrate` (clone/update tous les repos de reference)

### AD Tools (5)

- `bh_ingest_zip`, `bh_ingest_json` (BloodHound collector data)
- `dcsync_check` (detection candidats DCSync)
- `kerberos_classify` (classification hash/ticket + mode hashcat)
- `adcs_audit` (audit Certipy JSON pour ESC1-ESC8)

### Cloud Tools (6)

- `iam_policy_audit` (chemins privesc AWS IAM)
- `s3_buckets_from_text` (extraction noms S3)
- `user_data_secrets` (scan secrets EC2 user-data)
- `k8s_audit` (primitives d'escape manifests K8s)
- `tfstate_audit` (secrets dans Terraform state)
- `metadata_endpoints` (catalogue IMDS cloud)

### Contract Tools (6)

- `solidity_scan`, `solidity_scan_file` (scanner patterns offline)
- `slither_ingest` (ingestion JSON Slither)
- `foundry_reentrancy_test`, `foundry_access_test`, `foundry_flashloan_test` (generation tests PoC)

### Reversing Tools (7)

- `bin_identify`, `bin_strings`, `bin_packer`, `bin_rop`
- `bin_symbols_report`, `bin_ghidra_script`, `bin_r2_script`

### Defense Tools (4)

- `defense_read_brief`, `defense_execute_action`, `defense_log_action`, `defense_verify_status`

### OPPLAN Tools (6, injectes par middleware)

- `add_objective`, `get_objective`, `list_objectives`, `update_objective`, `objective_expand`, `objective_collapse`

## Middleware Stack (9 composants)

| Middleware | Applique a | Purpose |
|---|---|---|
| **SafeCommandMiddleware** | Agents avec bash | Bloque commandes dangereuses (voir section vulnerabilites) |
| **DecepticonSkillsMiddleware** | Tous | Disclosure progressive de skills avec tags MITRE ATT&CK |
| **FilesystemMiddleware** | Tous | ls/read/write/edit/glob/grep via CompositeBackend |
| **SubAgentMiddleware** | Orchestrateurs | `task()` tool pour deleguer aux sous-agents avec streaming |
| **OPPLANMiddleware** | Orchestrateurs | 6 outils CRUD objectifs + battle tracker dynamique |
| **ModelFallbackMiddleware** | Tous (si fallback defini) | Auto failover primary → fallback model sur erreur API |
| **SummarizationMiddleware** | Tous | Masquage observations, auto-compact sessions longues |
| **AnthropicPromptCachingMiddleware** | Tous | Marqueurs de cache pour prompt caching Anthropic |
| **PatchToolCallsMiddleware** | Tous | Fix tool calls malformes/pendants de la sortie LLM |

## Schemas Pydantic (complets)

### Engagement Bundle

```python
class EngagementBundle:
    roe: RoE
    conops: CONOPS
    deconfliction: DeconflictionPlan
    opplan: OPPLAN
    # save() cree la structure de workspace
```

### RoE (Rules of Engagement)

```python
class RoE:
    engagement_name: str
    client: str
    dates: DateRange
    scope: Scope  # in_scope/out_of_scope as ScopeEntry[]
    prohibited_actions: list[str]
    permitted_actions: list[str]
    escalation_contacts: list[Contact]
    incident_procedure: str
    authorization_reference: str
    data_handling: str
    cleanup_required: bool
```

### CONOPS

```python
class CONOPS:
    threat_actors: list[ThreatActor]
    attack_narrative: str
    kill_chain: list[KillChainPhase]
    methodology: str
    communication_plan: str
    success_criteria: list[str]
```

### OPPLAN (avec hierarchie)

```python
class Objective:
    id: str
    phase: ObjectivePhase  # 5 phases
    title: str
    description: str
    acceptance_criteria: str
    priority: int
    status: ObjectiveStatus  # 5 etats
    mitre: list[str]
    opsec: OpsecLevel  # 5 niveaux
    opsec_notes: str
    c2_tier: C2Tier  # 3 tiers
    concessions: list[str]
    blocked_by: list[str]
    owner: str
    parent_id: str | None
    notes: str
    # Methodes: children_of, descendants_of, detect_cycle, tree()
```

### Finding

```python
class Finding:
    id: str
    title: str
    severity: Severity  # critical, high, medium, low, info
    cvss_score: float
    cvss_vector: str  # CVSS v4.0
    cwe: list[str]
    mitre: list[str]
    affected_target: str
    affected_component: str
    description: str
    steps_to_reproduce: str
    impact: str
    evidence: list[Evidence]
    detected: bool
    detection_notes: str
    remediation: str
    remediation_priority: str
    objective_id: str
    phase: str
    agent: str
    iteration: int
    confidence: float
    discovered_at: datetime
    verified_methods: list[str]
```

### AttackPath

```python
class AttackPath:
    steps: list[AttackPathStep]

class AttackPathStep:
    order: int
    phase: str
    technique: str
    mitre: str
    source: str
    target: str
    tool: str
    detected: bool
    finding_id: str
```

### Defense schemas

```python
class DefenseBrief:
    recommendations: list[DefenseRecommendation]
    # 7 action types

class DefenseActionResult:
    action: str
    success: bool
    details: str

class VerificationResult:
    finding_ref: str
    outcome: str  # BLOCKED, PASSED, PARTIAL, ERROR
```

## Engagement Loop (Ralph Mode)

**Fichier** : `core/engagement_loop.py`

```
Phase 1 — Planning
  Decepticon → Soundwave → RoE + CONOPS + DeconflictionPlan + OPPLAN

Phase 2 — Attack (Ralph pattern)
  Pour chaque iteration (max 50):
    Prendre l'objectif de plus haute priorite avec dependances satisfaites
    Mapper ObjectivePhase → agent name
    Construire le prompt avec : objectif, RoE scope, findings precedents
    Invoquer l'agent via POST /runs (LangGraph API)
    Agent tourne dans le sandbox Kali
    Collecter findings, mettre a jour OPPLAN

Phase 3 — Vaccine (batch)
  Pour chaque finding accumule:
    Generer DefenseBrief (inference d'actions par mots-cles)
    Ecrire defense-brief.json
    Defender agent lit le brief, execute les actions
    Ecrire verification-{finding_ref}.json
    BLOCKED = defense verifiee / PASSED = defense echouee
```

**State persistence** : `.engagement-state.json` pour resume apres interruption

## Vaccine Loop (`orchestrator.py`)

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  ATTACK  │───>│  DEFENSE │───>│  VERIFY  │──┐
│ (exploit)│    │ (patch)  │    │(re-test) │  │
└──────────┘    └──────────┘    └──────────┘  │
      ^                                       │
      └───────────────────────────────────────┘
      Si defense echoue, re-attaque avec autre methode
```

**Phases** : `OrchestratorPhase(attack, brief_generation, defense, verification, complete)`
**State** : findings_discovered, findings_processed, defenses_applied, verification_results

## Neo4j Knowledge Graph

### Schema du graphe

**19 types de nodes** :
host, service, url, repo, source_file, code_location, vulnerability, cve, finding, credential, secret, user, entrypoint, crown_jewel, chain, hypothesis, candidate, dependency, scope

**17 types d'edges** :
runs_on, exposes, hosts, has_vuln, defined_in, located_at, affected_by, mapped_to, authenticates_to, grants, leaks, enables, chains_to, reaches, starts_at, contains, validates, affects

**Proprietes** : Chaque node a `id, kind, label, key (dedup), created_at, props dict`. Edges ont `id, src, dst, kind, weight (cost Dijkstra), key, created_at`.

**Backend** : Dual — Neo4j (prod) ou in-memory JSON (`/workspace/kg.json`). Configure via `BJHUNT_KG_BACKEND` et `BJHUNT_NEO4J_URI/USER/PASSWORD`.

**Chain planner** : Dijkstra shortest path ENTRYPOINT → CROWN_JEWEL. Cost model : lower = plus facile a exploiter. Critical vulns 0.4x cost, validated PoCs 0.5x cost.

**APOC** : restreint a `apoc.merge.*, apoc.create.*, apoc.path.*, apoc.algo.*` (pas d'import/export fichier)

## Skills System (59 SKILL.md files)

Structure YAML frontmatter (name, description, subdomain, mitre_attack, when_to_use) + Markdown body.
Disclosure progressive — seul le frontmatter charge initialement, contenu complet on-demand.

| Categorie | Nombre | Exemples |
|---|---|---|
| decepticon/ | 5 | engagement-lifecycle, orchestration, final-report |
| soundwave/ | 4 | roe-template, conops-template, opplan-converter |
| recon/ | 6 | osint, active-recon, passive-recon, web-recon, cloud-recon |
| exploit/ | 3 | web, ad, reporting |
| post-exploit/ | 6 | c2-sliver, credential-access, lateral-movement, privilege-escalation |
| analyst/ | 14 | sql-injection, ssti, ssrf, xxe, idor, command-injection, chains/* |
| reverser/ | 3 | firmware, triage |
| contracts/ | 2 | reentrancy |
| cloud/ | 2 | aws-iam-enum |
| ad/ | 1 | — |
| shared/ | 5 | opsec, finding-protocol, defense-evasion, references, workflow |
| pipeline/ | 6 | scanner, detector, verifier, patcher, exploiter, vulnresearch |

## Docker — 7 services

| Service | Image | Port | Network | RAM limit | CPU limit |
|---|---|---|---|---|---|
| litellm | ghcr.io/berriai/litellm:main-v1.82.3 | 4000 (localhost) | bjhunt-net | 512MB | 0.5 |
| postgres | postgres:17-alpine | 5432 (localhost) | bjhunt-net | 1GB | 0.5 |
| neo4j | neo4j:5.24-community | 7474, 7687 (localhost) | bjhunt-net + sandbox | — | — |
| sandbox | Custom Kali Rolling | — | sandbox ONLY | 4GB | 2 |
| langgraph | Custom Python 3.13 | 2024 (localhost) | bjhunt-net | 2GB | 1 |
| cli | Custom Node 22 | — | bjhunt-net | Profile: cli |
| c2-sliver | Custom Kali Rolling | 443, 53, 8888, 31337 | sandbox | Profile: c2-sliver |

**Networks** (frontiere de securite) :
- `bjhunt-net` — Management (litellm, postgres, langgraph, cli, neo4j)
- `bjhunt-sandbox-net` — Operationnel (sandbox, neo4j, c2-sliver, victims)
- LangGraph accede au sandbox via Docker socket (`/var/run/docker.sock:ro`), PAS via le reseau

**Docker socket mount** : LangGraph monte le socket Docker read-only pour gerer le sandbox.

**Profiles optionnels** : `cli`, `c2-sliver`, `victims` (DVWA + Metasploitable 2)

## Configuration

### Variables d'environnement (prefix `BJHUNT_`)

| Variable | Defaut | Purpose |
|---|---|---|
| `BJHUNT_DEBUG` | false | Mode debug |
| `BJHUNT_MODEL_PROFILE` | eco | eco/max/test |
| `BJHUNT_LLM__PROXY_URL` | http://localhost:4000 | LiteLLM URL |
| `BJHUNT_LLM__PROXY_API_KEY` | requis | LiteLLM master key |
| `BJHUNT_LLM__TIMEOUT` | 120 | Timeout LLM en secondes |
| `BJHUNT_LLM__MAX_RETRIES` | 2 | Retries par appel |
| `BJHUNT_DOCKER__SANDBOX_CONTAINER_NAME` | bjhunt-sandbox | Nom container |
| `BJHUNT_DOCKER__POLL_INTERVAL` | 0.5 | Interval poll secondes |
| `BJHUNT_DOCKER__STALL_SECONDS` | 3.0 | Detection stall |
| `BJHUNT_DOCKER__MAX_OUTPUT_CHARS` | 30000 | Limite output |
| `BJHUNT_DOCKER__AUTO_BACKGROUND_SECONDS` | 60 | Auto-background |
| `BJHUNT_DOCKER__SIZE_WATCHDOG_CHARS` | 5000000 | Watchdog taille |
| `BJHUNT_OPPLAN_MAX_ROWS` | 40 | Max rows OPPLAN |
| `BJHUNT_API_SECRET` | requis | Bearer token auth API |

### LiteLLM (`config/litellm.yaml`)

9 modeles sur 4 providers :
- **Anthropic** : claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5
- **OpenAI** : gpt-5.4, gpt-4.1
- **Google** : gemini-2.5-flash
- **Ollama Cloud** : glm-5.1:cloud, deepseek-v3.2:cloud, kimi-k2.5:cloud (via https://ollama.com/v1)

Router : simple-shuffle, 5 retries, 120s timeout, 15s retry_after

## Vulnerabilites — Etat actuel

| ID | Severite | Description | Etat dans le code |
|---|---|---|---|
| **C1** | CRITIQUE | Credentials par defaut | **CORRIGE** — env vars avec `?required`, plus de hardcoded |
| **C2** | HAUTE | Docker socket monte ro | **CONFIRME** — LangGraph peut lire env vars de tous les containers |
| **C3** | HAUTE | Sandbox root + NET_RAW/ADMIN | **CONFIRME** — necessaire pour nmap SYN, NET_BIND_SERVICE ajoute |
| **H1** | HAUTE | SafeCommand contournable | **AMELIORE** — shlex tokenization, mais `$VAR` simple non bloque |
| **H2** | HAUTE | API sans auth | **CORRIGE** — Bearer token via `BJHUNT_API_SECRET` + HMAC |
| **H3** | HAUTE | LiteLLM expose cles | **MITIGE** — bind 127.0.0.1 only, cles en env vars |
| **M1** | MOYENNE | Pas de validation input bash | **PARTIEL** — SafeCommand valide mais accepte strings arbitraires |
| **M2** | MOYENNE | Pas de TLS inter-container | **CONFIRME** — tout en plaintext sur Docker bridge |
| **M3** | MOYENNE | Neo4j APOC non restreint | **MITIGE** — restreint a merge/create/path/algo |

### Bypasses SafeCommand restants

```bash
# Bypass via expansion de variable simple :
CMD=pkill; $CMD bash     # $CMD expanse en pkill, bash comme argument
# SafeCommand bloque ${VAR-...} mais pas $VAR simple

# Bypass via env var pre-set :
export X=rm; $X -rf /     # Si une env var dangereuse est deja definie
```

**Recommandation** : whitelist de binaires autorises (approche deja documentee dans les docs).

## Tests (64 fichiers de tests)

Couverture par domaine :
- Core, LLM, Middleware, Agents, Backends, Research, References, AD, Cloud, Contracts, Reversing, Web, Tools, Reporting, Schemas, Observability
- Tests unitaires Python standard

## Ce que Decepticon NE fournit PAS

| Fonctionnalite | A construire dans |
|---|---|
| Auth utilisateurs / RBAC | Backend Hono |
| Interface web | Frontend Next.js (existe deja) |
| Multi-tenant / isolation donnees | Backend + RLS PostgreSQL |
| API authentifiee (au-dela de Bearer simple) | Backend Hono |
| Billing / abonnements | Backend + Stripe |
| Job queue / execution asynchrone | Backend + BullMQ |
| Schema relationnel applicatif | Backend + Drizzle |
| Scaling horizontal | Phase 2-3 (Fly.io, K8s) |
| Rate limiting | Backend + Redis |
| Event replay / reconnexion stream | Backend + PostgreSQL stream_events |
