import type { AppVariables } from "../../types.js";
/**
 * Admin routes — user management.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
// Admin routes are cross-org by definition — use the BYPASSRLS pool.
// Per docs/architecture/10-MULTI-TENANCY.md §131-148.
import { adminSql as sql } from "../../db/client.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { config } from "../../config.js";
import { hashPassword } from "../../auth/password.js";

export const adminUserRoutes = new Hono<{ Variables: AppVariables }>();

adminUserRoutes.use("*", requireAuth);
adminUserRoutes.use("*", requireAdmin);
adminUserRoutes.use("*", rateLimit(config.rateLimit.api));

// List all users (platform admin only)
adminUserRoutes.get("/", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 200);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const search = c.req.query("search")?.trim() || null;

  let users;
  let count: number;

  if (search) {
    const pattern = `%${search}%`;
    users = await sql`
      SELECT u.id, u.email, u.display_name, u.role, u.is_platform_admin,
             u.created_at, u.updated_at, o.name as org_name, o.slug as org_slug,
             o.plan, sl.last_login
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      LEFT JOIN (
        SELECT user_id, MAX(created_at) AS last_login
        FROM sessions
        GROUP BY user_id
      ) sl ON sl.user_id = u.id
      WHERE u.email ILIKE ${pattern}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [countRow] = await sql`SELECT count(*)::int as total FROM users WHERE email ILIKE ${pattern}`;
    count = (countRow as any)?.total ?? 0;
  } else {
    users = await sql`
      SELECT u.id, u.email, u.display_name, u.role, u.is_platform_admin,
             u.created_at, u.updated_at, o.name as org_name, o.slug as org_slug,
             o.plan, sl.last_login
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      LEFT JOIN (
        SELECT user_id, MAX(created_at) AS last_login
        FROM sessions
        GROUP BY user_id
      ) sl ON sl.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [countRow] = await sql`SELECT count(*)::int as total FROM users`;
    count = (countRow as any)?.total ?? 0;
  }

  return c.json({ users, total: count });
});

// Create user (platform admin only)
const createUserSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).optional(),
  role: z.enum(["owner", "admin", "member", "viewer"]).default("member"),
  orgId: z.string().uuid().optional(),
});

adminUserRoutes.post("/", zValidator("json", createUserSchema), async (c) => {
  const { email, password, displayName, role, orgId } = c.req.valid("json");
  const adminUser = c.get("user" as never) as { id: string };

  // Check if email already exists
  const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  // If orgId provided, verify it exists
  if (orgId) {
    const [org] = await sql`SELECT id FROM organizations WHERE id = ${orgId}`;
    if (!org) {
      return c.json({ error: "Organization not found" }, 404);
    }
  }

  const passwordHash = await hashPassword(password);
  const slug = email.split("@")[0]!.replace(/[^a-z0-9-]/g, "-").slice(0, 30);

  const result = await sql.begin(async (tx) => {
    let finalOrgId = orgId;

    // Create a new org if none provided
    if (!finalOrgId) {
      const [org] = await tx`
        INSERT INTO organizations (name, slug)
        VALUES (${`${slug}'s org`}, ${slug + "-" + Date.now().toString(36)})
        RETURNING id
      `;
      finalOrgId = org!.id as string;
    }

    const [user] = await tx`
      INSERT INTO users (org_id, email, password_hash, display_name, role)
      VALUES (${finalOrgId}, ${email}, ${passwordHash}, ${displayName || null}, ${role})
      RETURNING id, org_id, email, display_name, role, is_platform_admin, created_at, updated_at
    `;

    return user!;
  });

  // Audit log
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || null;
  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, ip_address, details)
    VALUES (${result.orgId}, ${adminUser.id}, 'admin.user.create', ${ip}, ${JSON.stringify({ createdUserId: result.id, email })})
  `;

  return c.json({ user: result }, 201);
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
  const adminUser = c.get("user" as never) as { id: string; isPlatformAdmin: boolean };

  // DOC-08 P0: an admin must not be able to demote themselves out of admin.
  // Prevents accidental self-lockout that would leave the platform without
  // any super_admin capable of restoring the role.
  if (id === adminUser.id && body.isPlatformAdmin === false) {
    return c.json(
      {
        error: "You cannot revoke your own platform_admin role. Ask another platform_admin to do it.",
        code: "SELF_DEMOTE_FORBIDDEN",
      },
      403,
    );
  }

  // DOC-08 P0: a platform_admin must not be able to demote ANOTHER
  // platform_admin without an explicit "force" flag. Reduces hostile-admin risk.
  if (body.isPlatformAdmin === false && id !== adminUser.id) {
    const [target] = await sql`SELECT is_platform_admin FROM users WHERE id = ${id}`;
    if (target?.isPlatformAdmin) {
      return c.json(
        {
          error:
            "Demoting another platform_admin requires a manual database action " +
            "(prevents collusion / hostile takeover). Contact security@bjhunt.com.",
          code: "PEER_DEMOTE_FORBIDDEN",
        },
        403,
      );
    }
  }

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

  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource, details)
    VALUES (${(updated as any).orgId || null}, ${adminUser.id}, 'admin.user.update',
            ${"user:" + id}, ${JSON.stringify({ fields: Object.keys(values) })})
  `;

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
  const adminUser = c.get("user" as never) as { id: string };

  // DOC-08 P0 — no self-delete (would lock the operator out and leave audit
  // logs with a NULL FK).
  if (id === adminUser.id) {
    return c.json(
      {
        error: "You cannot delete your own account from the admin panel. " +
          "Use Settings → Account if you really mean to leave the platform.",
        code: "SELF_DELETE_FORBIDDEN",
      },
      403,
    );
  }

  // Fetch user org_id + platform_admin flag BEFORE deletion (for audit log
  // and the peer-delete guard).
  const [target] = await sql`
    SELECT org_id, email, is_platform_admin FROM users WHERE id = ${id}
  `;
  if (!target) return c.json({ error: "User not found" }, 404);

  // DOC-08 P0 — no peer-platform-admin delete (prevents one rogue admin from
  // sweeping the others). Manual DB action required.
  if ((target as any).isPlatformAdmin) {
    return c.json(
      {
        error:
          "Deleting another platform_admin requires a manual database action. " +
          "Contact security@bjhunt.com.",
        code: "PEER_DELETE_FORBIDDEN",
      },
      403,
    );
  }

  const result = await sql`DELETE FROM users WHERE id = ${id}`;
  if (result.count === 0) return c.json({ error: "User not found" }, 404);

  await sql`
    INSERT INTO audit_logs (org_id, user_id, action, resource, details)
    VALUES (${(target as any)?.orgId || null}, ${adminUser.id}, 'admin.user.delete',
            ${"user:" + id}, ${JSON.stringify({ deletedEmail: (target as any)?.email })})
  `;

  return c.json({ ok: true });
});
