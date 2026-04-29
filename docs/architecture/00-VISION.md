# 00 — Vision & objectifs

## Pitch en une phrase

**BJHUNT est une plateforme SaaS où l'utilisateur dialogue en langage naturel avec une IA pour exécuter des audits de cybersécurité offensive sur ses propres systèmes, et reçoit les findings en streaming live.**

C'est ChatGPT, mais l'agent en face est un pentesteur autonome qui orchestre 300+ outils Kali (nmap, sqlmap, nuclei, burp, ffuf, bloodhound, etc.) dans un sandbox isolé par tenant.

## Public cible

| Segment | Use case principal | Ticket moyen |
|---|---|---|
| **Solo dev / indie hacker** | Auditer son propre site/API avant un launch | Free / Pro $0–$200 |
| **Startup tech (10–50 ppl)** | Pentest continu de leur stack, conformité SOC2 | Pro $200/mo |
| **Équipe sécurité interne** | Augmenter la productivité red team — l'IA fait le grunt work | Enterprise $2k+/mo |
| **Consultant freelance pentest** | Prise en main client + livrable PDF | Pro $200/mo |

## Promesses produit

1. **Conversation naturelle** — pas de scripts, pas de formulaires de scan : « Audite mon API REST en cherchant les IDORs et les fuites de tokens » → l'agent comprend, planifie, exécute, restitue.
2. **Streaming live** — token-par-token + tool calls + tool results visibles en temps réel (UX type Claude Code / Cursor Agent / Devin).
3. **Findings actionables** — chaque vulnérabilité = card structurée (sévérité, CVE, evidence, reproduction, remédiation, export PDF).
4. **Isolation hardware** — chaque tenant tourne dans son propre microVM Firecracker. Zéro fuite cross-tenant.
5. **Souveraineté EU** — données stockées en Allemagne (Hetzner Falkenstein), pas de Cloud Act US.

## Ce que BJHUNT n'est PAS

- ❌ Un scanner de vulnérabilités automatique (type Nessus, Nuclei standalone) — il y a un agent IA qui *raisonne*.
- ❌ Un wrapper ChatGPT qui suggère des commandes — il *exécute* dans un sandbox réel.
- ❌ Un outil pour attaquer des systèmes tiers sans autorisation — l'AUP (acceptable use policy) est explicite.
- ❌ Un remplaçant total des pentesteurs humains — c'est un copilote qui multiplie leur productivité.

## Métriques de succès (12 mois)

| Métrique | Cible |
|---|---|
| Beta signups | 500 |
| Pro paying users | 100 |
| Enterprise contracts | 5 |
| MRR | $25k |
| Audits exécutés / mois | 5 000 |
| False-positive rate | <5% |
| Median audit duration | <30 min |

## Différenciateurs vs concurrence

| Concurrent | Pourquoi BJHUNT gagne |
|---|---|
| **PentestGPT** (CLI tool) | UX SaaS multi-tenant + sandbox isolation + livrable client |
| **Cobalt / HackerOne** | Vitesse (minutes vs jours), prix (10x moins cher), 24/7 |
| **Nessus / Qualys** | Conversation > formulaires. Agent IA > scan basé sur signatures. |
| **Burp Pro** | Automation > opérateur manuel humain |
| **PentAGI / Decepticon** | Hosted SaaS clé-en-main, pas de self-host requis |

## Principes directeurs

1. **Streaming-first** — chaque réponse est un événement live, jamais un "spinner pendant 30min"
2. **Isolation > performance** — un container compromis ne doit JAMAIS contaminer un autre tenant
3. **Souveraineté EU** — RGPD natif, data residency Hetzner DE par défaut
4. **Coût marginal proche de zéro** — scale-to-zero sur l'inference, ephemeral sandboxes, pay-per-audit
5. **Open weights friendly** — Ollama Cloud aujourd'hui, modèle propriétaire entraîné sur RunPod demain
