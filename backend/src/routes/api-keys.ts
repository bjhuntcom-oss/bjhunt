/**
 * API key management routes.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { createApiKey, listApiKeys, revokeApiKey } from "../auth/api-keys.js";
import { sql } from "../db/client.js";
import { config } from "../config.js";
import type { AuthUser } from "../middleware/auth.js";

export const apiKeyRoutes = new Hono();

apiKeyRoutes.use("*", requireAuth);
apiKeyRoutes.use("*", rateLimit(config.rateLimit.api));

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

// List API keys for current org
apiKeyRoutes.get("/", async (c) => {
  const orgId = c.get("orgId") as string;
  const keys = await listApiKeys(orgId);
  return c.json({ keys });
});

// Create new API key
apiKeyRoutes.post("/", zValidator("json", createKeySchema), async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const { name, expiresInDays } = c.req.valid("json");

  const { key, plaintext } = await createApiKey(orgId, user.id, name, expiresInDays);

  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource)
    VALUES (${orgId}, ${user.id}, 'api_key.create', ${"api_key:" + key.id})
  `;

  // The plaintext is only returned once — the client must save it
  return c.json({ key, plaintext }, 201);
});

// Revoke API key
apiKeyRoutes.delete("/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");

  const deleted = await revokeApiKey(id, orgId);
  if (!deleted) return c.json({ error: "API key not found" }, 404);

  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource)
    VALUES (${orgId}, ${user.id}, 'api_key.revoke', ${"api_key:" + id})
  `;

  return c.json({ ok: true });
});
