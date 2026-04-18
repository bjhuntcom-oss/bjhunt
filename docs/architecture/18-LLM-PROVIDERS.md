# 18 — LLM Providers

> Multi-provider via LiteLLM proxy. Routing par plan, fallback automatique.

## Architecture LLM

```
Backend (Hono)
    │
    │ job config: { model: "anthropic/claude-sonnet-4-6" }
    │
    ▼
LangGraph (Decepticon)
    │
    │ llm = ChatLiteLLM(model="anthropic/claude-sonnet-4-6")
    │
    ▼
LiteLLM Proxy (port 4000)
    │
    │ Route based on model prefix
    │
    ├──── anthropic/* ──→ Anthropic API
    │     Authorization: Bearer sk-ant-...
    │
    ├──── openai/* ──→ OpenAI API
    │     Authorization: Bearer sk-...
    │
    ├──── ollama_chat/* ──→ Ollama Cloud
    │     Base URL: https://ollama.com/v1
    │     Authorization: Bearer ...
    │
    └──── google/* ──→ Google AI
          Authorization: Bearer ...
```

## Config LiteLLM

```yaml
# config/litellm.yaml

model_list:
  # ── ANTHROPIC ────────────────────────────────────────────
  - model_name: anthropic/claude-opus-4-6
    litellm_params:
      model: claude-opus-4-6
      api_key: os.environ/ANTHROPIC_API_KEY
      max_tokens: 8192
      stream: true

  - model_name: anthropic/claude-sonnet-4-6
    litellm_params:
      model: claude-sonnet-4-6
      api_key: os.environ/ANTHROPIC_API_KEY
      max_tokens: 8192
      stream: true

  # ── OLLAMA CLOUD ─────────────────────────────────────────
  - model_name: ollama/glm-5.1
    litellm_params:
      model: openai/GLM-5.1:cloud
      api_base: https://ollama.com/v1
      api_key: os.environ/OLLAMA_CLOUD_API_KEY
      stream: true

  - model_name: ollama/deepseek-v3.2
    litellm_params:
      model: openai/DeepSeek-v3.2:cloud
      api_base: https://ollama.com/v1
      api_key: os.environ/OLLAMA_CLOUD_API_KEY
      stream: true

  - model_name: ollama/kimi-k2.5
    litellm_params:
      model: openai/Kimi-k2.5:cloud
      api_base: https://ollama.com/v1
      api_key: os.environ/OLLAMA_CLOUD_API_KEY
      stream: true

  # ── OPENAI ───────────────────────────────────────────────
  - model_name: openai/gpt-5.4
    litellm_params:
      model: gpt-5.4
      api_key: os.environ/OPENAI_API_KEY
      stream: true

  - model_name: openai/gpt-5.4-mini
    litellm_params:
      model: gpt-5.4-mini
      api_key: os.environ/OPENAI_API_KEY
      stream: true

# ── ROUTING ──────────────────────────────────────────────
router_settings:
  routing_strategy: simple-shuffle  # Random parmi les modeles du meme nom
  num_retries: 2
  timeout: 120
  retry_after: 5
  allowed_fails: 3
  cooldown_time: 60

  # Fallback chain
  fallbacks:
    - anthropic/claude-sonnet-4-6: [ollama/glm-5.1, openai/gpt-5.4-mini]
    - anthropic/claude-opus-4-6: [anthropic/claude-sonnet-4-6, openai/gpt-5.4]
    - ollama/glm-5.1: [ollama/deepseek-v3.2, openai/gpt-5.4-mini]

# ── BUDGET ───────────────────────────────────────────────
litellm_settings:
  success_callback: ["langfuse"]   # Optionnel: tracking detaille
  max_budget: 500                   # $500/mois global
  budget_duration: 1m               # Reset mensuel
  num_retries: 2

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/LITELLM_DATABASE_URL  # PG pour spend tracking
```

## Routing par plan

| Plan | Modele par defaut | Modeles disponibles |
|---|---|---|
| Free | ollama/glm-5.1 | glm-5.1 uniquement |
| Starter | anthropic/claude-sonnet-4-6 | sonnet-4.6, glm-5.1, deepseek-v3.2 |
| Pro | anthropic/claude-sonnet-4-6 | tous (y compris opus-4.6) |
| Enterprise | choix user | tous + modeles custom |

### Implementation dans le backend

```typescript
// services/engagement.service.ts

function resolveModel(userPlan: string, requestedModel: string): string {
  const PLAN_MODELS: Record<string, string[]> = {
    free: ['ollama/glm-5.1'],
    starter: ['anthropic/claude-sonnet-4-6', 'ollama/glm-5.1', 'ollama/deepseek-v3.2'],
    pro: ['anthropic/claude-opus-4-6', 'anthropic/claude-sonnet-4-6',
          'openai/gpt-5.4', 'ollama/glm-5.1', 'ollama/deepseek-v3.2', 'ollama/kimi-k2.5'],
    enterprise: ['*'],  // Tous les modeles
  };

  const allowed = PLAN_MODELS[userPlan];

  if (allowed[0] === '*' || allowed.includes(requestedModel)) {
    return requestedModel;
  }

  // Fallback au modele par defaut du plan
  return allowed[0];
}
```

## Cout par provider

| Provider | Modele | Input ($/1M tokens) | Output ($/1M tokens) | Latence TTFT |
|---|---|---|---|---|
| Anthropic | Claude Opus 4.6 | $15.00 | $75.00 | ~1.5s |
| Anthropic | Claude Sonnet 4.6 | $3.00 | $15.00 | ~0.8s |
| Anthropic | Claude Haiku 4.5 | $0.80 | $4.00 | ~0.3s |
| OpenAI | GPT-5.4 | $5.00 | $15.00 | ~1.0s |
| OpenAI | GPT-5.4-mini | $0.40 | $1.60 | ~0.3s |
| Ollama Cloud | GLM-5.1 | ~$0.50 | ~$2.00 | ~0.5s |
| Ollama Cloud | DeepSeek-v3.2 | ~$0.70 | ~$2.80 | ~0.6s |
| Ollama Cloud | Kimi-k2.5 | ~$0.60 | ~$2.40 | ~0.5s |

## Fallback strategy

```
Requete LLM
    │
    ▼
Modele principal (ex: claude-sonnet-4-6)
    │
    ├── Succes → return response
    │
    ├── Echec (timeout, rate limit, 500)
    │   │
    │   ▼
    │   Retry 1 (meme modele, apres 5s)
    │   │
    │   ├── Succes → return response
    │   │
    │   ├── Echec
    │   │   │
    │   │   ▼
    │   │   Fallback 1 (ex: ollama/glm-5.1)
    │   │   │
    │   │   ├── Succes → return response
    │   │   │
    │   │   ├── Echec
    │   │   │   │
    │   │   │   ▼
    │   │   │   Fallback 2 (ex: openai/gpt-5.4-mini)
    │   │   │   │
    │   │   │   ├── Succes → return response
    │   │   │   │
    │   │   │   └── Echec → Error: all providers failed
```

## Monitoring des couts

### Dashboard admin — vue LLM

Donnees depuis LiteLLM spend tracking (PostgreSQL) :

```sql
-- Cout par provider ce mois
SELECT
    model_group,
    SUM(spend) as total_spend,
    COUNT(*) as request_count,
    AVG(total_tokens) as avg_tokens
FROM litellm_spend_logs
WHERE starttime >= date_trunc('month', now())
GROUP BY model_group
ORDER BY total_spend DESC;

-- Cout par user ce mois
SELECT
    u.email,
    SUM(l.spend) as total_spend,
    COUNT(*) as request_count
FROM litellm_spend_logs l
JOIN users u ON l.metadata->>'user_id' = u.id::text
WHERE l.starttime >= date_trunc('month', now())
GROUP BY u.email
ORDER BY total_spend DESC;
```

### Alertes budget

```typescript
// Cron: toutes les heures
async function checkBudget() {
  const monthSpend = await litellm.getMonthSpend();
  const budget = await getSetting('llm_monthly_budget'); // $500 default

  if (monthSpend > budget * 0.8) {
    await notify('admin', `LLM spend at ${Math.round(monthSpend/budget*100)}% of budget ($${monthSpend}/$${budget})`);
  }

  if (monthSpend > budget) {
    // Fallback tous les users vers le modele le moins cher
    await setSetting('force_model_override', 'ollama/glm-5.1');
    await notify('admin', `LLM budget exceeded. Forced fallback to GLM-5.1.`);
  }
}
```

## Cache de prompts

LiteLLM supporte le prompt caching natif d'Anthropic :
- Les system prompts des agents Decepticon sont identiques entre les sessions
- Le cache reduit le cout des tokens input de ~90%
- TTL du cache: 5 minutes (Anthropic)
- Impact: le cout reel est ~50-70% du cout theorique

```python
# Dans Decepticon, les system prompts utilisent le cache-control
response = await litellm.acompletion(
    model="anthropic/claude-sonnet-4-6",
    messages=[
        {
            "role": "system",
            "content": RECON_AGENT_SYSTEM_PROMPT,  # ~5000 tokens, cache
            "cache_control": {"type": "ephemeral"},
        },
        {"role": "user", "content": user_input},
    ],
    stream=True,
)
```
