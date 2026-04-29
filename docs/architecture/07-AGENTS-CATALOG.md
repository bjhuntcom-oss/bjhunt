# 07 — Agents IA — catalogue cible

> Les agents prévus pour le rebuild. Inspirés de l'engine legacy Decepticon (17 agents PurpleAILAB) mais à réimplémenter sur OpenHands SDK V1 + LangGraph. Le casting peut évoluer au moment du rebuild.

## Hiérarchie

```
                      ┌────────────────┐
                      │   BJHUNT       │  Orchestrator principal
                      │ (Coordinator)  │  Décompose la requête user, dispatch sous-agents
                      └───────┬────────┘
                              │
            ┌─────────────────┼─────────────────┬──────────────────┐
            ▼                 ▼                 ▼                  ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  Soundwave   │  │  Recon       │  │   Exploit    │  │ PostExploit  │
   │ Engagement   │  │  OSINT +     │  │  SQLi, SSTI, │  │ Privesc, AD, │
   │ planning,    │  │  scan ports, │  │  Kerberoast, │  │ lateral mvmt │
   │ ROE, OPPLAN  │  │  enum services│ │  ADCS, etc.  │  │              │
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

## Catalogue détaillé

### BJHUNT (Coordinator)
- **Rôle** : reçoit la requête en LN, parse l'intention, choisit la phase d'engagement, dispatch
- **Tools** : aucun direct — délègue uniquement
- **Output** : sub-agent transitions, summary final
- **LLM tier** : strong reasoning (Claude 4.7 / GLM-5.1 / Kimi-k2.5)

### Soundwave (Planning)
- **Rôle** : préparer l'engagement (Rules of Engagement, CONOPS, OPPLAN structuré)
- **Tools** : web search target, DNS lookups, WHOIS, certificate transparency
- **Output** : OPPLAN markdown signé par l'user via interactive `interrupt()`
- **Quand** : début de chaque nouvel audit, avant tout scan actif

### Recon
- **Rôle** : énumération passive et active de la surface d'attaque
- **Tools** : 
  - Passive : amass, subfinder, crt.sh, shodan
  - Active : nmap, masscan, nuclei (templates info), ffuf, gobuster
  - Web : whatweb, wappalyzer, builtwith API
- **Output** : asset inventory (subdomains, ports, services, technologies), feed graph Neo4j

### Exploit
- **Rôle** : exploitation de vulnérabilités identifiées
- **Tools** : sqlmap (SQLi), tplmap (SSTI), Kerberoast, Rubeus, ADCS exploitation, custom exploits
- **Output** : findings avec evidence (request/response, dump partiel), severity HIGH+
- **Garde-fous** : SecurityAnalyzer marque ces commands HIGH → confirmation `interrupt()` user (sauf opt-in mode auto)

### PostExploit
- **Rôle** : escalade privilèges, mouvement latéral, persistence (en lab uniquement, jamais prod sans ROE)
- **Tools** : impacket suite, mimikatz alt (kekeo, lazagne), CrackMapExec, BloodHound
- **Output** : kill chain narrative, credentials leak (masqués dans output user)

### Analyst (Code review)
- **Rôle** : audit code source si fourni (URL git, upload archive)
- **Tools** : Semgrep, CodeQL, custom rules, fuzzers (afl++, libfuzzer wrappers)
- **Output** : findings code + chaînes d'exploitation potentielles + suggested fix

### Reverser
- **Rôle** : analyse binaire ELF / PE / firmware
- **Tools** : Ghidra (headless), radare2, ROPgadget, qiling emulator
- **Output** : findings de sécurité statique + dynamique sur binary

### Contract Auditor (Web3)
- **Rôle** : audit smart contracts Solidity / EVM
- **Tools** : Slither, Mythril, Echidna fuzz, Foundry forge test
- **Output** : findings reentrancy, flash-loan attacks, oracle manipulation

### Cloud Hunter
- **Rôle** : audit configuration cloud (AWS, Azure, GCP, K8s)
- **Tools** : ScoutSuite, prowler, kubeaudit, k8s-bench, S3 takeover scripts
- **Output** : misconfig findings (publicly readable buckets, IAM privesc paths, etc.)

### AD Operator
- **Rôle** : audit Active Directory
- **Tools** : BloodHound, Rubeus, Certify, ldapdomaindump, Kerberoasting
- **Output** : ADCS ESC1-15 paths, golden ticket potential, LAPS bypass

### Defender (Blue team mode)
- **Rôle** : agent défensif optionnel — propose remédiations + monitoring
- **Tools** : SIGMA rule generator, suricata rule, IDS signatures
- **Output** : detection rules + hardening checklist par finding identifié

### Reporter
- **Rôle** : génère le livrable final
- **Tools** : aucun — traitement structuré des findings + LLM pour exec summary
- **Output** : PDF (template BJHUNT branded), SARIF (CI/CD intégration), JSON, HTML

## Conventions inter-agents

### Format finding (commun à tous)
```ts
type Finding = {
  id: string                    // UUID v7
  agent: string                 // Émetteur
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  cvss?: number                 // 0-10
  cwe?: string                  // CWE-89
  cve?: string                  // CVE-2024-...
  title: string                 // < 80 chars
  description: string           // markdown
  affectedAsset: {              // Cible de la vulnérabilité
    type: 'url' | 'host' | 'binary' | 'contract' | 'cloud_resource'
    identifier: string
  }
  evidence: {                   // Reproductibilité
    type: 'http_request' | 'tool_output' | 'screenshot' | 'log'
    content: string
    metadata?: Record<string, any>
  }[]
  remediation: string           // markdown
  references: string[]          // URLs
  detectedAt: string            // ISO
}
```

### Skill files
Chaque technique d'attaque documentée comme un `SKILL.md` (pattern hérité de Decepticon) :

```markdown
# SQL Injection — Union-based extraction

## When to use
Whitebox or blackbox web app where parameters reach SQL query.

## Tools
- sqlmap (primary)
- manual payload crafting (fallback)

## Steps
1. ...
2. ...

## Evidence to collect
- Vulnerable request
- DB dump partial (3 rows)
- DBMS fingerprint

## Common pitfalls
- WAF false-positives
- ...
```

Les skills sont indexés par embeddings (pgvector ou Pinecone) et l'orchestrator peut les récupérer pour briefing in-context.

## Choix LLM par agent (au rebuild)

| Agent | LLM tier | Justification |
|---|---|---|
| BJHUNT (Coordinator) | Strong reasoning (Claude 4.7 / GLM-5.1) | Décomposition stratégique |
| Soundwave | Strong reasoning | Génération OPPLAN structuré |
| Recon | Fast (DeepSeek / Kimi) | Output volumineux, peu de raisonnement |
| Exploit | Strong reasoning | Adaptation aux réponses serveur |
| PostExploit | Strong reasoning | Multi-step planning |
| Analyst | Strong reasoning | Compréhension code |
| Reverser | Strong reasoning | Décompilation insights |
| Contract Auditor | Strong reasoning | Math reasoning Solidity |
| Cloud Hunter | Mid (gpt-oss) | Pattern matching configs |
| AD Operator | Strong reasoning | ADCS chain understanding |
| Defender | Mid | Rule generation templates |
| Reporter | Strong (Claude 4.7) | Quality writing PDF |

Routing via LiteLLM proxy. Fallback chain configurable.

## Customization tenant

Tier Enterprise : possibilité de fournir ses propres LLM API keys (Anthropic perso) → routes via LiteLLM avec credentials tenant. Coût direct au tenant, pas mutualisé.
