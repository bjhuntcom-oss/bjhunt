/**
 * Admin routes — user management.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { sql } from "../../db/client.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { config } from "../../config.js";

export const adminUserRoutes = new Hono();

adminUserRoutes.use("*", requireAuth);
adminUserRoutes.use("*", requireAdmin);
adminUserRoutes.use("*", rateLimit(config.rateLimit.api));

// List all users (platform admin only)
adminUserRoutes.get("/", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 200);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const users = await sql`
    SELECT u.id, u.email, u.display_name, u.role, u.is_platform_admin,
           u.created_at, u.updated_at, o.name as org_name, o.slug as org_slug
    FROM users u
    JOIN organizations o ON u.org_id = o.id
    ORDER BY u.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ count }] = await sql`SELECT count(*) FROM users`;

  return c.json({ users, total: Number(count) });
});

// Get single user
adminUserRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [user] = await sql`
    SELECT u.*, o.name as org_name, o.slug as org_slug
    FROM users u
    JOIN organizations o ON u.org_id = o.id
    WHERE u.id = ${id}
  `;

  if (!user) return c.json({ error: "User not found" }, 404);
  // Strip password_hash from response
  const { passwordHash: _, ...safe } = user as any;
  return c.json({ user: safe });
});

// Update user (role, platform admin status)
const updateUserSchema = z.object({
  role: z.enum(["owner", "admin", "member", "viewer"]).optional(),
  isPlatformAdmin: z.boolean().optional(),
});

adminUserRoutes.patch("/:id", zValidator("json", updateUserSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const values: Record<string, unknown> = {};
  if (body.role !== undefined) values.role = body.role;
  if (body.isPlatformAdmin !== undefined) values.isPlatformAdmin = body.isPlatformAdmin;

  if (Object.keys(values).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  const [updated] = await sql`
    UPDATE users SET ${sql(values as any)}
    WHERE id = ${id}
    RETURNING id, email, role, is_platform_admin
  `;

  if (!updated) return c.json({ error: "User not found" }, 404);
  return c.json({ user: updated });
});

// Get user sessions
adminUserRoutes.get("/:id/sessions", async (c) => {
  const id = c.req.param("id");
  const sessions = await sql`
    SELECT id, ip_address, user_agent, expires_at, created_at
    FROM sessions
    WHERE user_id = ${id} AND expires_at > now()
    ORDER BY created_at DESC
  `;
  return c.json({ sessions });
});

// Revoke all user sessions
adminUserRoutes.post("/:id/revoke-sessions", async (c) => {
  const id = c.req.param("id");
  const result = await sql`DELETE FROM sessions WHERE user_id = ${id}`;
  return c.json({ ok: true, revokedSessions: result.count });
});

// Delete user
adminUserRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await sql`DELETE FROM users WHERE id = ${id}`;
  if (result.count === 0) return c.json({ error: "User not found" }, 404);
  return c.json({ ok: true });
});
