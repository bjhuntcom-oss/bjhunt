/**
 * Admin routes — LLM gateway provider management.
 *
 * Manages provider configs (Anthropic, OpenAI, Ollama, etc.) stored in
 * the gateway_providers table. Also proxies Ollama model management.
 *
 * Frontend consumers:
 *   - providers-client.tsx  (list, delete, test, set default)
 *   - provider-edit-form.tsx (create/update provider)
 *   - ollama-models.tsx     (list/pull/delete Ollama models)
 */

import type { AppVariables } from "../../types.js";
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { sql } from "../../db/client.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { config } from "../../config.js";
import { encryptSecret, decryptSecret, looksEncrypted } from "../../lib/crypto.js";
import { isPublicHttpsUrl } from "../../lib/url-validator.js";
import { stream } from "hono/streaming";

export const gatewayRoutes = new Hono<{ Variables: AppVariables }>();

gatewayRoutes.use("*", requireAuth);
gatewayRoutes.use("*", requireAdmin);
gatewayRoutes.use("*", rateLimit(config.rateLimit.api));

// ── Zod schemas ────────────────────────────────────────────────────────

const modelSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  reasoning: z.boolean().default(false),
  input: z.array(z.string()).default(["text"]),
  contextWindow: z.number().int().min(1).default(32768),
  maxTokens: z.number().int().min(1).default(8192),
  cost: z
    .object({
      input: z.number().min(0).default(0),
      output: z.number().min(0).default(0),
      cacheRead: z.number().min(0).default(0),
      cacheWrite: z.number().min(0).default(0),
    })
    .default({}),
});

const providerSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  baseUrl: z.string().url().max(500),
  apiKey: z.string().max(500).default(""),
  api: z.literal("ollama").optional(),
  models: z.array(modelSchema).default([]),
  enabled: z.boolean().default(true),
});

const defaultsSchema = z.object({
  model: z.string().min(1).max(300),
});

// ── Helper: encrypt/mask API keys ───────────────────────────────────────

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "***";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

// ── Helper: convert DB row to frontend ProviderConfig ───────────────────

interface DbProvider {
  id: string;
  name: string;
  providerType: string;
  apiKeyEncrypted: string | null;
  apiBase: string | null;
  enabled: boolean;
  isDefault: boolean;
  models: unknown;
  config: unknown;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestLatency: number | null;
  createdAt: string;
  updatedAt: string;
}

function dbToProvider(row: DbProvider) {
  const providerConfig = (row.config || {}) as Record<string, unknown>;
  return {
    id: row.providerType,
    name: row.name,
    baseUrl: row.apiBase || "",
    apiKey: maskApiKey(row.apiKeyEncrypted || ""),
    ...(providerConfig.api === "ollama" ? { api: "ollama" as const } : {}),
    models: row.models as unknown[],
    enabled: row.enabled,
  };
}

// ── GET / — Full gateway config (providers + defaults + ui) ─────────────

gatewayRoutes.get("/", async (c) => {
  const rows = await sql`SELECT * FROM gateway_providers ORDER BY created_at ASC`;

  const providers: Record<string, ReturnType<typeof dbToProvider>> = {};
  for (const row of rows) {
    const p = dbToProvider(row as unknown as DbProvider);
    providers[p.id] = p;
  }

  // Read default model from platform_settings
  const [defaultRow] = await sql`
    SELECT value FROM platform_settings WHERE key = 'gateway_default_model'
  `;
  const defaultModel = (defaultRow?.value as string) || "";

  // Read UI config from platform_settings
  const [uiRow] = await sql`
    SELECT value FROM platform_settings WHERE key = 'gateway_ui'
  `;
  const ui = (uiRow?.value as Record<string, unknown>) || {
    assistant: { name: "BJHUNT", avatar: "/logo.svg" },
  };

  return c.json({
    providers,
    defaults: { model: defaultModel },
    ui,
  });
});

// ── POST /providers/:id — Create or update a provider ───────────────────

gatewayRoutes.post(
  "/providers/:id",
  zValidator("json", providerSchema),
  async (c) => {
    const providerId = c.req.param("id");
    const body = c.req.valid("json");

    // Check if provider exists
    const [existing] = await sql`
      SELECT id FROM gateway_providers WHERE provider_type = ${providerId}
    `;

    const configJson = body.api ? { api: "ollama" } : {};

    if (existing) {
      // Update — build dynamic columns
      const updates: Record<string, unknown> = {
        name: body.name,
        apiBase: body.baseUrl,
        enabled: body.enabled,
        models: JSON.stringify(body.models),
        config: JSON.stringify(configJson),
      };
      // Only update API key if a real (non-masked) key was provided. Always
      // encrypt before hitting the DB (C-14, CWE-312) — column holds ciphertext.
      if (body.apiKey && !body.apiKey.includes("...")) {
        updates.apiKeyEncrypted = encryptSecret(body.apiKey);
      }
      await sql`
        UPDATE gateway_providers SET ${sql(updates as any)}
        WHERE provider_type = ${providerId}
      `;
    } else {
      // Insert — encrypt apiKey at rest (null if no key was supplied).
      const encryptedKey = body.apiKey ? encryptSecret(body.apiKey) : null;
      await sql`
        INSERT INTO gateway_providers (name, provider_type, api_key_encrypted, api_base, enabled, models, config)
        VALUES (
          ${body.name}, ${providerId}, ${encryptedKey},
          ${body.baseUrl}, ${body.enabled},
          ${JSON.stringify(body.models)}, ${JSON.stringify(configJson)}
        )
      `;
    }

    // Audit log
    const adminUser = c.get("user");
    await sql`
      INSERT INTO audit_logs (user_id, action, resource, details)
      VALUES (${adminUser.id}, 'admin.gateway.upsert',
              ${"provider:" + providerId},
              ${JSON.stringify({ name: body.name, modelsCount: body.models.length })})
    `;

    return c.json({ ok: true });
  },
);

// ── GET /providers/:id — Get single provider ────────────────────────────

gatewayRoutes.get("/providers/:id", async (c) => {
  const providerId = c.req.param("id");
  const [row] = await sql`
    SELECT * FROM gateway_providers WHERE provider_type = ${providerId}
  `;

  if (!row) return c.json({ error: "Provider not found" }, 404);

  return c.json({ provider: dbToProvider(row as unknown as DbProvider) });
});

// ── DELETE /providers/:id — Delete a provider ───────────────────────────

gatewayRoutes.delete("/providers/:id", async (c) => {
  const providerId = c.req.param("id");

  const result = await sql`
    DELETE FROM gateway_providers WHERE provider_type = ${providerId}
  `;

  if (result.count === 0) return c.json({ error: "Provider not found" }, 404);

  const adminUser = c.get("user");
  await sql`
    INSERT INTO audit_logs (user_id, action, resource)
    VALUES (${adminUser.id}, 'admin.gateway.delete', ${"provider:" + providerId})
  `;

  return c.json({ ok: true });
});

// ── POST /providers/:id/test — Test provider connectivity ───────────────
//
// Fixed against SSRF (C-15, Finding #3-37): request body is ignored — the
// endpoint tests the provider config already stored in the DB (looked up
// by :id) and never accepts an attacker-chosen baseUrl. The resolved URL
// is additionally run through `isPublicHttpsUrl` to block cloud metadata,
// link-local, loopback, and RFC1918 destinations at fetch time.

gatewayRoutes.post("/providers/:id/test", async (c) => {
  const providerId = c.req.param("id");

  const [row] = await sql`
    SELECT provider_type, api_key_encrypted, api_base, config, models
    FROM gateway_providers
    WHERE provider_type = ${providerId}
  `;

  if (!row) {
    return c.json({ error: "Provider not found" }, 404);
  }

  const providerRow = row as unknown as {
    providerType: string;
    apiKeyEncrypted: string | null;
    apiBase: string | null;
    config: Record<string, unknown> | null;
    models: Array<{ id?: string }> | null;
  };

  const baseUrl = providerRow.apiBase || "";
  if (!baseUrl) {
    return c.json({ ok: false, error: "Provider has no base URL configured" });
  }

  const urlCheck = isPublicHttpsUrl(baseUrl);
  if (!urlCheck.ok) {
    return c.json({ ok: false, error: `Base URL rejected: ${urlCheck.reason}` });
  }

  // Decrypt the stored API key. Legacy rows that predate C-14 will still be
  // plaintext; we surface a clear error asking the admin to re-save.
  let apiKey = "";
  const stored = providerRow.apiKeyEncrypted || "";
  if (stored) {
    if (looksEncrypted(stored)) {
      try {
        apiKey = decryptSecret(stored);
      } catch {
        return c.json({
          ok: false,
          error: "Stored API key could not be decrypted — re-enter and save it",
        });
      }
    } else {
      return c.json({
        ok: false,
        error:
          "Stored API key is in legacy plaintext format — re-enter and save it to encrypt at rest",
      });
    }
  }

  const isOllama = (providerRow.config as { api?: string } | null)?.api === "ollama";
  if (!apiKey && !isOllama) {
    return c.json({ ok: false, error: "No API key configured" });
  }

  const start = Date.now();

  try {
    let response: Response;

    if (isOllama) {
      // Ollama API — just list models. No auth header.
      response = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(15000),
        redirect: "manual",
      });
    } else {
      // OpenAI-compatible API — send a minimal chat completion.
      const modelId = providerRow.models?.[0]?.id || "gpt-4";
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(15000),
        redirect: "manual",
      });
    }

    // Reject redirects — otherwise the upstream could send us to an internal
    // host that passed the initial `isPublicHttpsUrl` check.
    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get("location") || "";
      const locCheck = loc
        ? isPublicHttpsUrl(loc)
        : { ok: false as const, reason: "empty Location" };
      if (!locCheck.ok) {
        return c.json({
          ok: false,
          error: `Upstream redirected to a disallowed target (${locCheck.reason})`,
        });
      }
      // Even if the Location is public, we do not follow it automatically;
      // treat as failure so the admin reconfigures the base URL.
      return c.json({
        ok: false,
        error: `Upstream returned redirect ${response.status} — update base URL`,
      });
    }

    const latencyMs = Date.now() - start;

    if (response.ok) {
      await sql`
        UPDATE gateway_providers SET
          last_tested_at = now(),
          last_test_status = 'success',
          last_test_latency = ${latencyMs}
        WHERE provider_type = ${providerId}
      `.catch(() => {});

      return c.json({ ok: true, latencyMs });
    }

    const errorText = await response.text().catch(() => "Unknown error");
    const errorMsg =
      response.status === 401
        ? "Invalid API key"
        : response.status === 403
          ? "Access denied"
          : `HTTP ${response.status}: ${errorText.slice(0, 200)}`;

    await sql`
      UPDATE gateway_providers SET
        last_tested_at = now(),
        last_test_status = 'error',
        last_test_latency = ${latencyMs}
      WHERE provider_type = ${providerId}
    `.catch(() => {});

    return c.json({ ok: false, error: errorMsg });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const errorMsg =
      err instanceof Error
        ? err.name === "TimeoutError"
          ? "Connection timeout (15s)"
          : err.message
        : "Unknown error";

    await sql`
      UPDATE gateway_providers SET
        last_tested_at = now(),
        last_test_status = 'error',
        last_test_latency = ${latencyMs}
      WHERE provider_type = ${providerId}
    `.catch(() => {});

    return c.json({ ok: false, error: errorMsg });
  }
});

// ── PATCH /defaults — Set default model ─────────────────────────────────

gatewayRoutes.patch(
  "/defaults",
  zValidator("json", defaultsSchema),
  async (c) => {
    const { model } = c.req.valid("json");

    await sql`
      INSERT INTO platform_settings (key, value)
      VALUES ('gateway_default_model', ${JSON.stringify(model)})
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(model)}, updated_at = now()
    `;

    return c.json({ ok: true });
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// Ollama model management routes (proxied to local/remote Ollama instance)
// Mounted separately at /api/admin/ollama
// ═══════════════════════════════════════════════════════════════════════════

export const ollamaRoutes = new Hono<{ Variables: AppVariables }>();

ollamaRoutes.use("*", requireAuth);
ollamaRoutes.use("*", requireAdmin);
ollamaRoutes.use("*", rateLimit(config.rateLimit.api));

/**
 * Resolve the Ollama base URL from a configured ollama-type provider,
 * or fall back to OLLAMA_BASE_URL env var / localhost.
 */
async function getOllamaBaseUrl(): Promise<string> {
  const [row] = await sql`
    SELECT api_base FROM gateway_providers
    WHERE config->>'api' = 'ollama' AND enabled = true
    LIMIT 1
  `;
  return (row?.apiBase as string) || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
}

// ── GET /models — List installed Ollama models ──────────────────────────

ollamaRoutes.get("/models", async (c) => {
  try {
    const baseUrl = await getOllamaBaseUrl();
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return c.json({ models: [], error: `Ollama API error: ${res.status}` });
    }

    const data = (await res.json()) as { models?: Array<{ name: string; size: number; modified_at: string }> };
    return c.json({ models: data.models || [] });
  } catch (err) {
    return c.json({
      models: [],
      error: err instanceof Error ? err.message : "Failed to connect to Ollama",
    });
  }
});

// ── DELETE /models/:name — Delete an Ollama model ───────────────────────

ollamaRoutes.delete("/models/:name", async (c) => {
  const name = c.req.query("name") || decodeURIComponent(c.req.param("name"));

  try {
    const baseUrl = await getOllamaBaseUrl();
    const res = await fetch(`${baseUrl}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return c.json({ error: `Failed to delete: ${text}` }, 500);
    }

    return c.json({ ok: true });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to connect to Ollama" },
      500,
    );
  }
});

// ── POST /models/pull — Pull/download an Ollama model (SSE stream) ──────

const pullSchema = z.object({
  name: z.string().min(1).max(200),
});

ollamaRoutes.post(
  "/models/pull",
  zValidator("json", pullSchema),
  async (c) => {
    const { name } = c.req.valid("json");

    const baseUrl = await getOllamaBaseUrl();

    let ollamaRes: Response;
    try {
      ollamaRes = await fetch(`${baseUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, stream: true }),
        signal: AbortSignal.timeout(600000), // 10 minute timeout for large models
      });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Failed to connect to Ollama" },
        502,
      );
    }

    if (!ollamaRes.ok || !ollamaRes.body) {
      const text = await ollamaRes.text().catch(() => "");
      return c.json({ error: `Ollama pull failed: ${text}` }, 502);
    }

    // Stream the Ollama NDJSON response as SSE to the frontend
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    return stream(c, async (s) => {
      const reader = ollamaRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              await s.write(`data: ${JSON.stringify(parsed)}\n\n`);
            } catch {
              // skip malformed lines
            }
          }
        }

        // Process any remaining data in the buffer
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer.trim());
            await s.write(`data: ${JSON.stringify(parsed)}\n\n`);
          } catch {
            // skip
          }
        }
      } finally {
        reader.releaseLock();
      }
    });
  },
);
