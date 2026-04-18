/**
 * Admin routes — agent profile management.
 *
 * Manages AI agent personality profiles stored in the agent_profiles table.
 * These profiles define the SOUL.md, AGENTS.md, identity, and visibility
 * of the AI assistant. Only one profile can be active at a time.
 *
 * Frontend consumer: agents-client.tsx
 */

import type { AppVariables } from "../../types.js";
import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
// Admin routes are cross-org by definition — use the BYPASSRLS pool.
// Per docs/architecture/10-MULTI-TENANCY.md §131-148.
import { adminSql as sql } from "../../db/client.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { config } from "../../config.js";

export const agentRoutes = new Hono<{ Variables: AppVariables }>();

agentRoutes.use("*", requireAuth);
agentRoutes.use("*", requireAdmin);
agentRoutes.use("*", rateLimit(config.rateLimit.api));

// ── Zod schemas ────────────────────────────────────────────────────────

const createProfileSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  soul_md: z.string().max(50000).default(""),
  agents_md: z.string().max(50000).default(""),
  identity_name: z.string().max(100).nullable().optional(),
  identity_emoji: z.string().max(10).nullable().optional(),
  visible_to_users: z.boolean().default(false),
});

const updateProfileSchema = createProfileSchema.partial();

// ── GET / — List all agent profiles (summary) ───────────────────────────

agentRoutes.get("/", async (c) => {
  const profiles = await sql`
    SELECT id, name, description, is_active, is_default, updated_at
    FROM agent_profiles
    ORDER BY is_active DESC, is_default DESC, updated_at DESC
  `;

  return c.json({ profiles });
});

// ── GET /:id — Get single agent profile (full) ─────────────────────────

agentRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [profile] = await sql`
    SELECT id, name, description, soul_md, agents_md,
           identity_name, identity_emoji,
           is_default, is_active, visible_to_users,
           created_at, updated_at
    FROM agent_profiles
    WHERE id = ${id}
  `;

  if (!profile) return c.json({ error: "Profile not found" }, 404);

  return c.json({ profile });
});

// ── POST / — Create a new agent profile ─────────────────────────────────

agentRoutes.post(
  "/",
  zValidator("json", createProfileSchema),
  async (c) => {
    const body = c.req.valid("json");

    const [profile] = await sql`
      INSERT INTO agent_profiles (
        name, description, soul_md, agents_md,
        identity_name, identity_emoji, visible_to_users
      )
      VALUES (
        ${body.name},
        ${body.description ?? null},
        ${body.soul_md},
        ${body.agents_md},
        ${body.identity_name ?? null},
        ${body.identity_emoji ?? null},
        ${body.visible_to_users}
      )
      RETURNING id, name, description, is_active, is_default, updated_at
    `;

    // Audit log
    const adminUser = c.get("user");
    await sql`
      INSERT INTO audit_logs (user_id, action, resource, details)
      VALUES (${adminUser.id}, 'admin.agent.create',
              ${"agent_profile:" + profile!.id},
              ${JSON.stringify({ name: body.name })})
    `;

    return c.json({ profile }, 201);
  },
);

// ── PATCH /:id — Update an agent profile ────────────────────────────────

agentRoutes.patch(
  "/:id",
  zValidator("json", updateProfileSchema),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    // Build SET clause dynamically from provided fields
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.soul_md !== undefined) updates.soulMd = body.soul_md;
    if (body.agents_md !== undefined) updates.agentsMd = body.agents_md;
    if (body.identity_name !== undefined) updates.identityName = body.identity_name;
    if (body.identity_emoji !== undefined) updates.identityEmoji = body.identity_emoji;
    if (body.visible_to_users !== undefined) updates.visibleToUsers = body.visible_to_users;

    if (Object.keys(updates).length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    const [profile] = await sql`
      UPDATE agent_profiles SET ${sql(updates as any)}
      WHERE id = ${id}
      RETURNING id, name, description, soul_md, agents_md,
                identity_name, identity_emoji,
                is_default, is_active, visible_to_users,
                updated_at
    `;

    if (!profile) return c.json({ error: "Profile not found" }, 404);

    // Audit log
    const adminUser = c.get("user");
    await sql`
      INSERT INTO audit_logs (user_id, action, resource, details)
      VALUES (${adminUser.id}, 'admin.agent.update',
              ${"agent_profile:" + id},
              ${JSON.stringify({ fields: Object.keys(updates) })})
    `;

    return c.json({ profile });
  },
);

// ── DELETE /:id — Delete an agent profile ───────────────────────────────

agentRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");

  // Prevent deleting active or default profiles
  const [existing] = await sql`
    SELECT is_active, is_default FROM agent_profiles WHERE id = ${id}
  `;
  if (!existing) return c.json({ error: "Profile not found" }, 404);
  if (existing.isActive) {
    return c.json({ error: "Cannot delete the active profile" }, 400);
  }
  if (existing.isDefault) {
    return c.json({ error: "Cannot delete the default profile" }, 400);
  }

  await sql`DELETE FROM agent_profiles WHERE id = ${id}`;

  // Audit log
  const adminUser = c.get("user");
  await sql`
    INSERT INTO audit_logs (user_id, action, resource)
    VALUES (${adminUser.id}, 'admin.agent.delete', ${"agent_profile:" + id})
  `;

  return c.json({ ok: true });
});

// ── POST /:id/activate — Activate an agent profile ─────────────────────

agentRoutes.post("/:id/activate", async (c) => {
  const id = c.req.param("id");

  // Verify profile exists
  const [profile] = await sql`
    SELECT id, name FROM agent_profiles WHERE id = ${id}
  `;
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  // Deactivate all, then activate the target
  await sql.begin(async (tx) => {
    await tx`UPDATE agent_profiles SET is_active = false WHERE is_active = true`;
    await tx`UPDATE agent_profiles SET is_active = true WHERE id = ${id}`;
  });

  // Also store the active profile id in platform_settings for quick access
  await sql`
    INSERT INTO platform_settings (key, value)
    VALUES ('active_agent_profile', ${JSON.stringify(id)})
    ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(id)}, updated_at = now()
  `;

  // Audit log
  const adminUser = c.get("user");
  await sql`
    INSERT INTO audit_logs (user_id, action, resource, details)
    VALUES (${adminUser.id}, 'admin.agent.activate',
            ${"agent_profile:" + id},
            ${JSON.stringify({ name: profile.name })})
  `;

  return c.json({ ok: true });
});
