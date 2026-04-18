# 15 — Pricing & Billing

> Recherche web approfondie sur le marche, les concurrents, les couts reels.
> Identification d'inconsistance dans le codebase actuel.
> Sources : Pentera, Horizon3.ai, HackerOne, Cobalt, Detectify, Intruder, Devin, Claude API docs.

## ALERTE : Inconsistance pricing dans le codebase

Le pricing est defini a 3 endroits avec 3 valeurs differentes :

| Source | Free | Pro | Enterprise |
|---|---|---|---|
| `backend/src/plans.ts` (autoritatif) | $0 | **$200/mo** | **$2,000/mo** |
| `docs/architecture/15-PRICING-BILLING.md` (ancien) | $0 | $79/mo | Custom |
| `app/[locale]/_components/pricing-teaser.tsx` | 0 EUR | **49 EUR** | Sur devis |

**Action requise** : unifier sur une source unique. Le backend (`plans.ts`) est l'autorite.

## Analyse concurrentielle — Donnees reelles

### Tier A : Plateformes de pentest automatise (concurrents directs)

| Concurrent | Modele | Prix annuel | Detail |
|---|---|---|---|
| **Pentera** | Quote, par endpoint | **$35,000-$150,000+/an** | Deal moyen ~$100K. Unicorn ($1B+ valuation). |
| **Horizon3.ai (NodeZero)** | Quote, par org | **$50,000-$200,000+/an** | Cible DoD, secteurs regules. AWS Marketplace. |
| **HackerOne** (pentest) | Par engagement | **$15,000-$75,000/engagement** | Abonnements annuels $60K-$200K. Programmes complets $250K-$750K+. |
| **Cobalt** | Credits (1 credit = 8h pentest) | **$65,000-$300,000+/an** | Starter $8,500 min. Professional $80K-$150K. |

### Tier B : Scanners de vulnerabilites (concurrents adjacents)

| Concurrent | Modele | Prix | Detail |
|---|---|---|---|
| **Detectify** | Par asset | $302/mo (25 assets surface) | Enterprise 50+ assets > $75K/an |
| **Intruder** | Par cible | $149/mo Essential, $499/mo Pro | Infra vs App licences separees |
| **Probely** | Par cible | A partir de $39/mo | Free tier : 5h scan/mois |
| **Acunetix** | Par FQDN | ~$7,000/an starting | Mid-market |
| **Invicti** | Par FQDN | ~$7,000+/an starting | Enterprise nettement plus cher |
| **Pentest-Tools.com** | Par asset | A partir de $95/mo | Scans illimites par asset |

### Tier C : Agents IA (marche adjacent, evolution rapide)

| Produit | Prix actuel | Modele | Detail cle |
|---|---|---|---|
| **Devin** (Cognition) | $20/mo base + $2.25/ACU | Usage-based | Etait $500/mo jusqu'a Devin 2.0 (avril 2025). Crash de prix. |
| **GitHub Copilot** | $10-$39/mo | Per-seat | Business : 300 premium requests/mo. Enterprise : 1,000. |
| **Cursor** | $20-$200/mo | Credits pool | Monthly credit pool = plan price. |
| **OpenHands** | Free (OSS) / Enterprise custom | Usage-based, at-cost LLM | Pas de markup sur les couts LLM cloud. |

### Tendance du marche

Le modele dominant en 2026 est **hybride** : abonnement base ($10-$50/mo) + **overage usage-based** (credits, compute units). Le pricing pur par siege est en declin — la chute de Devin de $500 a $20 le confirme.

## Positionnement BJHUNT

BJHUNT a $200/mo Pro est **~5-10% du prix** de Pentera/NodeZero ($100K/an).
C'est un positionnement agressif qui cible le **SMB/mid-market**, pas l'enterprise.

| Segment | Fourchette de prix | BJHUNT vs |
|---|---|---|
| SMB/DevSecOps | $100-$500/mo | Competitif avec Intruder, Probely |
| Mid-market | $500-$2,000/mo | Notre tier Enterprise |
| Enterprise | $30K-$100K+/an | Quote-based, pas encore cible |

## Grille tarifaire recommandee (basee sur la recherche)

| | Free | Pro | Enterprise |
|---|---|---|---|
| **Prix** | $0/mois | **$199/mois** | **$1,999/mois** (ou custom) |
| **Scans inclus** | 0 (demo 5 min) | 5 | 20 |
| **Scan supplementaire** | N/A | $25/scan | $15/scan |
| **Chat AI** | 5 min demo | Illimite | Illimite |
| **Agents** | 3 (demo) | 10 | Tous les 17 |
| **AI Model** | GLM-5.1 | Sonnet 4.6 (Opus +$5/scan) | Tous les modeles |
| **Streaming live** | Oui | Oui | Oui |
| **OPPLAN Tracker** | Non | Oui | Oui |
| **Vaccine Loop** | Non | Oui | Oui |
| **Findings Dashboard** | Vue seule | Export | Export |
| **CVE Intelligence** | Non | Oui | Oui |
| **Skills Catalog** | Non | Oui | Oui |
| **Knowledge Graph** | Non | Non | Oui |
| **Tool Playground** | Non | Non | Oui |
| **Cloud Wizard** | Non | Non | Oui |
| **AD Chain Builder** | Non | Non | Oui |
| **Export Markdown** | Non | Oui | Oui |
| **Export CSV** | Non | Oui | Oui |
| **HackerOne Format** | Non | Non | Oui |
| **API v1** | Non | Non | Oui |
| **Webhooks** | Non | Non | Oui |
| **Support** | Community | Email (48h) | Slack dedie |
| **SSO/SAML** | Non | Non | Oui |
| **Priority queue** | Derniere | Normale | Haute + dediee |
| **Historique** | 7 jours | 90 jours | 1 an |

## Couts reels par audit (revises par la recherche)

### Cout LLM (le plus gros poste)

Les estimations precedentes ($0.30/audit avec Sonnet) sont **sous-estimees**.
Les workflows agentiques avec tool use consomment typiquement 200K-500K tokens.

| Phase | Tokens estimes | Cout Sonnet | Cout Opus |
|---|---|---|---|
| Planning (Soundwave) | 20K in + 5K out | $0.135 | $0.225 |
| Recon | 50K in + 10K out | $0.30 | $0.50 |
| Exploitation | 80K in + 20K out | $0.54 | $0.90 |
| Analyse/Reporting | 30K in + 15K out | $0.315 | $0.525 |
| Overhead (retries, tool calls) | 20K in + 5K out | $0.135 | $0.225 |
| **Total** | **~200K in + 55K out** | **~$1.43** | **~$2.38** |

### Avec prompt caching Anthropic (60% cache hit rate)

| Modele | Sans cache | Avec cache | Economie |
|---|---|---|---|
| Sonnet 4.6 | $1.43 | **~$0.89** | 38% |
| Opus 4.6 | $2.38 | **~$1.58** | 34% |
| Haiku 4.5 | $0.48 | **~$0.30** | 37% |

**Reference industrie** : ProjectDiscovery (outil securite) a reduit ses couts LLM de **59%** avec le prompt caching seul.

### Cout infrastructure par audit

| Composant | Cout/audit | Calcul |
|---|---|---|
| Sandbox compute | ~$0.03-$0.08 | 2GB RAM, 30-120min, nmap/nuclei CPU-intensifs |
| PostgreSQL storage | ~$0.005 | Findings, knowledge graph |
| Redis queue | ~$0.001 | Negligeable |
| Bandwidth | ~$0.01-$0.02 | ~50MB par audit |
| **Total infra** | **~$0.05-$0.12** | |

### Cout total par audit

| Modele | LLM (avec cache) | Infra | **Total** |
|---|---|---|---|
| Sonnet 4.6 | $0.89 | $0.08 | **~$1.00** |
| Opus 4.6 | $1.58 | $0.08 | **~$1.66** |
| GLM-5.1 (Ollama Cloud) | $0.15 | $0.08 | **~$0.23** |

## Analyse de marge

| Plan | Prix/scan | Cout/scan (Sonnet) | Cout/scan (Opus) | Marge Sonnet | Marge Opus |
|---|---|---|---|---|---|
| Pro ($199/mo, 5 scans) | $39.80/scan | $1.00 | $1.66 | **97%** | **96%** |
| Enterprise ($1,999/mo, 20 scans) | $99.95/scan | $1.00 | $1.66 | **99%** | **98%** |
| Overage Pro ($25/scan) | $25/scan | $1.00 | $1.66 | **96%** | **93%** |

**Les marges sont excellentes** grace au modele queue-based (pas d'infra dediee par user).

### Benchmarks industrie

| Metrique | Benchmark SaaS | BJHUNT |
|---|---|---|
| Gross margin median | 77% | **96-99%** |
| Software cybersecurity | 70-80% | Au-dessus |
| Top performers | 80%+ | Au-dessus |

## Break-even

| Poste fixe | Cout/mois |
|---|---|
| VPS Hostinger KVM 8 | $40 |
| Domain | ~$1 |
| Vercel (Hobby → Pro) | $0-$20 |
| Resend (email) | $0 (free tier) |
| **Total fixe** | **~$41-$61/mois** |

**Break-even** : 1 user Pro ($199) couvre tout avec $138 de marge.

## Integration Stripe — Implementation 2026

### CRITIQUE : Legacy `usage_records` API supprimee

Depuis mars 2026, il faut utiliser **Stripe Meters** (pas les anciens usage_records) :

```
Meter → definit l'event (ex: "scan_completed")
Price → lie au Meter, set $/unit
Subscription → lie le customer au Price
Meter Events → donnees brutes d'usage envoyees par le backend
```

### Modele recommande : Credits + Subscription

```
Pro ($199/mo):
  - 5 scan credits inclus (via subscription)
  - $25 par scan supplementaire (via Meter overage)

Enterprise ($1,999/mo):
  - 20 scan credits inclus
  - $15 par scan supplementaire
```

Stripe supporte nativement les billing credits (`/v1/billing/credit_grants`) depuis 2025.

### Checkout flow

```
1. User clique "Upgrade to Pro"
2. POST /api/billing/checkout { plan: 'pro' }
3. Backend cree Stripe Checkout Session
4. Redirect vers Stripe hosted checkout
5. User paie
6. Webhook: checkout.session.completed
7. Backend met a jour user.plan
8. Redirect vers /settings avec confirmation
```

### Webhook handler — Regles critiques

1. **Retourner 2xx en < 5 secondes** — stocker l'event, traiter async
2. **Idempotence** : stocker `event.id` en DB, verifier avant traitement (Stripe PEUT envoyer des doublons)
3. **Out-of-order** : `subscription.updated` peut arriver AVANT `subscription.created`
4. **Events critiques** : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`
5. **Retry schedule Stripe** : immediat, 5min, 30min, 2h, 5h, 10h, puis toutes les 12h pendant 3 jours

### Portal de gestion

L'utilisateur gere son abonnement via Stripe Customer Portal :

```typescript
app.post('/api/billing/portal', requireAuth, async (c) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: 'https://bjhunt.com/settings',
  });
  return c.json({ url: session.url });
});
```

## Quotas — Implementation

### Verification avant chaque audit

```typescript
async function checkQuota(userId: string): Promise<void> {
  // 1. Quota mensuel (compteur par period YYYY-MM)
  // 2. Concurrence (nombre de jobs actifs)
  // 3. Increment atomique du compteur
  // Pas de reset explicite — nouveau mois = nouveau compteur
}
```

### Limites par plan

| Ressource | Free | Pro | Enterprise |
|---|---|---|---|
| Scans/mois | 0 (demo) | 5 | 20 |
| Max concurrent | 0 | 1 | 2 |
| Max duree scan | 5 min | 2h | 4h |
| Sandbox RAM | 1 GB | 2 GB | 4 GB |
| API requests/min | 10 | 50 | 100 |
| API keys | 0 | 5 | 20 |
| Historique | 7 jours | 90 jours | 1 an |

## Conversion free → paid

### Benchmarks de conversion

| Type de trial | Conversion mediane | Top quartile |
|---|---|---|
| Opt-out (CB requise) | 48.8% | — |
| Opt-in (pas de CB) | 23.4% (2026) | 35-45% |
| Freemium → paid | 2.6% | — |

**Recommandation BJHUNT** : trial opt-in 14 jours, pas de CB requise. Cible 23% de conversion.
L'onboarding personnalise par AI ajoute +6.1pp. Time to first value < 10 minutes.

## Projections financieres

### Scenario MVP (6 mois)

| Mois | Users total | Payants | MRR | Couts fixes | LLM variable | Profit |
|---|---|---|---|---|---|---|
| M1 | 5 | 0 | $0 | $41 | $5 | -$46 |
| M2 | 15 | 2 Pro | $398 | $41 | $20 | +$337 |
| M3 | 30 | 5 Pro | $995 | $61 | $50 | +$884 |
| M4 | 45 | 8 Pro, 1 Ent | $3,591 | $61 | $120 | +$3,410 |
| M5 | 60 | 10 Pro, 2 Ent | $5,988 | $61 | $200 | +$5,727 |
| M6 | 80 | 15 Pro, 3 Ent | $8,982 | $61 | $350 | +$8,571 |

### Metriques investisseur a atteindre

| Metrique | Cible Series A | BJHUNT Pro @ N users |
|---|---|---|
| $1M ARR | — | 417 Pro ($199) ou 42 Enterprise ($1,999) |
| LTV:CAC > 3:1 | — | A mesurer apres 6 mois |
| Net revenue retention > 100% | — | Overage charges + upgrades |
| Gross margin > 80% | — | ✅ 96-99% |

### Marche adressable

- Marche pentest : **$2.74B en 2025**, projete **$7.41B en 2034** (CAGR 11.6%)
- Segment PTaaS : croissance la plus rapide a **29.1% CAGR**
- 70%+ des organisations ont adopte le PTaaS

Sources des donnees : Mordor Intelligence, Fortune Business Insights, Pentera SEC filings, HackerOne pricing (Spendflo), Cobalt pricing (Vendr), Stripe docs, Claude API pricing, ProjectDiscovery blog, ChartMogul SaaS reports, CloudZero benchmarks.
