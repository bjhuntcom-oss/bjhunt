# 07 — Catalogue des agents IA

> Casting d'agents prévu. À implémenter dans le fork openclaude modifié.

## Hiérarchie

```
                      ┌────────────────┐
                      │   BJHUNT       │  Coordinator principal
                      │ (Coordinator)  │  Décompose la requête user, dispatch
                      └───────┬────────┘
                              │
            ┌─────────────────┼─────────────────┬──────────────────┐
            ▼                 ▼                 ▼                  ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  Soundwave   │  │  Recon       │  │   Exploit    │  │ PostExploit  │
   │  Planning    │  │  OSINT +     │  │  SQLi, SSTI, │  │ Privesc, AD, │
   │  ROE,        │  │  scan ports, │  │  Kerberoast, │  │ lateral mvmt │
   │  OPPLAN      │  │  enum        │  │  ADCS, etc.  │  │              │
   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
            │                 │                 │                  │
            └─────────────────┴─────────┬───────┴──────────────────┘
                                        │
            ┌──────────────┬─────────────┴───────────┬──────────────┐
            ▼              ▼                         ▼              ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ┌──────────┐
   │   Analyst    │  │   Reverser   │  │ Contract Auditor │  │ Defender │
   │ Code review, │  │ Binary triage│  │ Solidity / EVM   │  │ Vaccine  │
   │ CVE, fuzzing │  │ ROP, Ghidra  │  │ reentrancy, etc. │  │ loop     │
   └──────────────┘  └──────────────┘  └──────────────────┘  └──────────┘

   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │ Cloud Hunter │  │ AD Operator  │  │  Reporter    │
   │ AWS, Azure,  │  │ BloodHound,  │  │ PDF/SARIF,   │
   │ K8s RBAC     │  │ Kerberoast,  │  │ exec summary │
   │              │  │ ADCS ESC1-15 │  │              │
   └──────────────┘  └──────────────┘  └──────────────┘
```

## Détail par agent

### BJHUNT (Coordinator)
- **Rôle** : reçoit la requête en LN, parse l'intention, choisit la phase d'engagement, dispatch
- **Tools** : aucun direct — délègue uniquement
- **Output** : sub-agent transitions, summary final
- **Modèle** : Claude 4.7 OR GLM-5.1 (strong reasoning)
- **System prompt** : à écrire spécifiquement pour cybersec offensive — décomposition stratégique, choix sub-agent selon target type (web app, AD, cloud, contract), consolidation findings

### Soundwave (Planning)
- **Rôle** : préparer l'engagement (Rules of Engagement, CONOPS, OPPLAN structuré markdown)
- **Tools** : web search target, DNS lookups, WHOIS, certificate transparency (crt.sh), shodan API
- **Output** : OPPLAN markdown, validé par user via `interrupt()` LangGraph-like (UI modal approval)
- **Quand** : début de chaque nouvel audit, avant tout scan actif
- **Modèle** : Claude 4.7 (génération structured output)

### Recon
- **Rôle** : énumération passive et active de la surface d'attaque
- **Tools** :
  - Passive : `amass`, `subfinder`, `crt.sh`, `shodan-cli`
  - Active : `nmap`, `masscan`, `nuclei` (templates info), `ffuf`, `gobuster`
  - Web : `whatweb`, `wappalyzer`, `builtwith` API
- **Output** : asset inventory (subdomains, ports, services, technologies), feed pgvector graph
- **Modèle** : DeepSeek-v3.2 (volume + speed)

### Exploit
- **Rôle** : exploitation des vulnérabilités identifiées
- **Tools** : `sqlmap`, `tplmap` (SSTI), `kerberoast.py`, `Rubeus`, `Certify` (ADCS), `metasploit` (modules sélectifs)
- **Output** : findings avec evidence (request/response, dump partiel), severity HIGH+
- **Garde-fous** : SecurityAnalyzer marque ces commands HIGH → confirmation `interrupt()` user (sauf opt-in mode auto Enterprise)
- **Modèle** : Claude 4.7 (raisonnement adaptatif aux réponses serveur)

### PostExploit
- **Rôle** : escalade privilèges, mouvement latéral, persistence (en lab uniquement, jamais prod sans ROE explicite)
- **Tools** : `impacket-suite` (psexec, smbexec, secretsdump), `kekeo`, `lazagne`, `CrackMapExec`, `BloodHound-CE`
- **Output** : kill chain narrative, credentials leak (masqués dans output user via SecretRegistry)
- **Modèle** : Claude 4.7

### Analyst (Code review)
- **Rôle** : audit code source si fourni (URL git, archive zip uploadée)
- **Tools** : `Semgrep`, `CodeQL` (offline mode), `bandit`, `eslint-plugin-security`, fuzzers (`afl++`, `libfuzzer` wrappers)
- **Output** : findings code + chaînes d'exploitation potentielles + suggested fix
- **Modèle** : Claude 4.7 (compréhension code)

### Reverser
- **Rôle** : analyse binaire ELF/PE/firmware
- **Tools** : `Ghidra` (headless), `radare2`, `ROPgadget`, `qiling` emulator
- **Output** : findings sécurité statique + dynamique sur binary
- **Modèle** : Claude 4.7 (insights décompilation)

### Contract Auditor (Web3, optionnel)
- **Rôle** : audit smart contracts Solidity / EVM
- **Tools** : `Slither`, `Mythril`, `Echidna` fuzz, `Foundry forge test`
- **Output** : findings reentrancy, flash-loan attacks, oracle manipulation
- **Modèle** : Claude 4.7 (math reasoning)

### Cloud Hunter
- **Rôle** : audit configuration cloud (AWS, Azure, GCP, K8s)
- **Tools** : `ScoutSuite`, `prowler`, `kubeaudit`, `k8s-bench`, scripts S3 takeover
- **Output** : misconfig findings (publicly readable buckets, IAM privesc paths)
- **Modèle** : DeepSeek-v3.2 (pattern matching configs)

### AD Operator
- **Rôle** : audit Active Directory
- **Tools** : `BloodHound-CE`, `Rubeus`, `Certify`, `ldapdomaindump`, `kerbrute`
- **Output** : ADCS ESC1-15 paths, golden ticket potential, LAPS bypass, attack chains
- **Modèle** : Claude 4.7 (ADCS chain understanding)

### Defender (Blue team mode, opt-in)
- **Rôle** : agent défensif optionnel — propose remédiations + monitoring
- **Tools** : SIGMA rule generator, Suricata rules, IDS signatures
- **Output** : detection rules + hardening checklist par finding identifié
- **Modèle** : DeepSeek-v3.2

### Reporter
- **Rôle** : génère le livrable final
- **Tools** : aucun — traitement structuré des findings + LLM pour exec summary
- **Output** : PDF (template BJHUNT branded), SARIF (CI/CD intégration), JSON, HTML
- **Modèle** : Claude 4.7 (qualité writing)

## Format Finding (commun à tous)

```ts
type Finding = {
  id: string                    // UUID v7
  agent: string                 // Agent émetteur
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  cvss?: number                 // 0-10
  cwe?: string                  // CWE-89
  cve?: string                  // CVE-2024-...
  title: string                 // < 80 chars
  description: string           // markdown
  affectedAsset: {
    type: 'url' | 'host' | 'binary' | 'contract' | 'cloud_resource'
    identifier: string
  }
  evidence: {
    type: 'http_request' | 'tool_output' | 'screenshot' | 'log'
    content: string
    metadata?: Record<string, any>
  }[]
  remediation: string           // markdown
  references: string[]          // URLs
  detectedAt: string            // ISO
}
```

## SKILL files

Chaque technique d'attaque documentée comme un `SKILL.md` dans `engine/skills/`:

```markdown
# SQL Injection — Union-based extraction

## When to use
Whitebox or blackbox web app where parameters reach SQL query.

## Tools
- sqlmap (primary)
- manual payload crafting (fallback)

## Steps
1. Identify injection point (param tampering)
2. Confirm via boolean-based / time-based blind
3. Extract DB schema
4. Dump data partial (3 rows)

## Evidence to collect
- Vulnerable request (full HTTP)
- DB dump partial
- DBMS fingerprint

## Common pitfalls
- WAF false-positives (test with `--tamper=between`)
- Auto-encoded payloads breaking
```

Les skills sont indexées par embeddings dans `pgvector` et l'orchestrator les récupère via similarity search lors du briefing in-context.

## Choix LLM par agent

| Agent | Modèle primary | Modèle fallback | Justification |
|---|---|---|---|
| BJHUNT (Coordinator) | Claude 4.7 | GLM-5.1 | Décomposition stratégique critique |
| Soundwave | Claude 4.7 | GLM-5.1 | Génération OPPLAN structuré |
| Recon | DeepSeek-v3.2 | Kimi-k2.5 | Output volumineux, peu de raisonnement |
| Exploit | Claude 4.7 | GLM-5.1 | Adaptation aux réponses serveur |
| PostExploit | Claude 4.7 | GLM-5.1 | Multi-step planning |
| Analyst | Claude 4.7 | DeepSeek-v3.2 | Compréhension code |
| Reverser | Claude 4.7 | GLM-5.1 | Décompilation insights |
| Contract Auditor | Claude 4.7 | GLM-5.1 | Math reasoning Solidity |
| Cloud Hunter | DeepSeek-v3.2 | Kimi-k2.5 | Pattern matching configs |
| AD Operator | Claude 4.7 | GLM-5.1 | ADCS chain understanding |
| Defender | DeepSeek-v3.2 | Kimi-k2.5 | Rule generation templates |
| Reporter | Claude 4.7 | — | Quality writing PDF |

Routing via LiteLLM proxy. Si Claude 4.7 quota dépassé ou latency >10s, fallback automatique.

## Customization tier Enterprise

Tier Enterprise : possibilité de fournir ses propres LLM API keys (Anthropic perso) → routing via LiteLLM avec credentials tenant. Coût direct au tenant, pas mutualisé. Permet aux clients très sensibles de garantir que leurs données ne transitent que par leur compte LLM provider.
