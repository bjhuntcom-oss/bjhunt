import type { AppVariables } from "../../types.js";
/**
 * Admin routes — platform settings + audit logs.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { sql } from "../../db/client.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { config } from "../../config.js";

export const adminSettingsRoutes = new Hono<{ Variables: AppVariables }>();

adminSettingsRoutes.use("*", requireAuth);
adminSettingsRoutes.use("*", requireAdmin);
adminSettingsRoutes.use("*", rateLimit(config.rateLimit.api));

// ── Platform settings ────────────────────────────────────────────────────

adminSettingsRoutes.get("/", async (c) => {
  const settings = await sql`SELECT * FROM platform_settings ORDER BY key`;
  return c.json({ settings });
});

const setSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
});

adminSettingsRoutes.put("/", zValidator("json", setSettingSchema), async (c) => {
  const { key, value } = c.req.valid("json");

  await sql`
    INSERT INTO platform_settings (key, value)
    VALUES (${key}, ${JSON.stringify(value)})
    ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = now()
  `;

  return c.json({ ok: true });
});

// ── Audit logs ───────────────────────────────────────────────────────────

adminSettingsRoutes.get("/audit-logs", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 200);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const action = c.req.query("action");

  const logs = action
    ? await sql`
        SELECT al.*, u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.action = ${action}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    : await sql`
        SELECT al.*, u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

  return c.json({ logs });
});

// ── LangGraph agents status ──────────────────────────────────────────────

adminSettingsRoutes.get("/agents", async (c) => {
  try {
    const { langgraphClient } = await import("../../lib/langgraph-client.js");
    const assistants = await langgraphClient.listAssistants();
    return c.json({ agents: assistants });
  } catch (err) {
    return c.json({ error: "Failed to connect to LangGraph API", agents: [] }, 502);
  }
});
