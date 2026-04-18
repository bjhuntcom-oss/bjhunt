/**
 * Authentication middleware — resolves session or API key to user context.
 */

import type { Context, MiddlewareHandler } from "hono";
import { getSession } from "../auth/session.js";
import { validateApiKey } from "../auth/api-keys.js";
// Auth resolution (session + API key + getUserById) runs BEFORE the tenant
// context is established — the request hasn't been told which org it belongs
// to yet. Use the admin pool (BYPASSRLS) so the lookup isn't blocked by RLS.
import { adminSql as sql } from "../db/client.js";

export interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  role: string;
  isPlatformAdmin: boolean;
}

/**
 * Resolve authentication from session cookie or API key Bearer token.
 * Sets `userId`, `orgId`, and `user` on the context if authenticated.
 * Does NOT reject unauthenticated requests — use `requireAuth` for that.
 */
export const resolveAuth: MiddlewareHandler = async (c, next) => {
  // Try API key first (Bearer token)
  const authHeader = c.req.header("authorization") || "";
  if (authHeader.startsWith("Bearer bjk_")) {
    const token = authHeader.slice(7);
    const result = await validateApiKey(token);
    if (result) {
      const user = await getUserById(result.userId);
      if (user) {
        setAuthContext(c, user);
      }
    }
    return next();
  }

  // Session auth: HttpOnly cookie is the ONLY accepted transport.
  //
  // SECURITY (audit C-13 / #3-03):
  // We previously accepted the session id via `?token=<sid>` query string
  // and `Authorization: Bearer session:<sid>` header as fallbacks for
  // cross-origin SSE. Both were removed:
  //   - query strings are logged by proxies/browsers and forbidden by
  //     OWASP Session Management Cheat Sheet (Session ID in URL)
  //   - `Bearer session:` let any party that obtained the cookie value
  //     replay it without the browser's HttpOnly/SameSite protections
  //
  // Cross-origin streaming now goes through the signed SP3 ticket flow
  // (see lib/stream-ticket.ts + routes/chat.ts GET /stream/:runId). That
  // path does NOT accept a raw session id — it verifies an HMAC-signed
  // payload and is unaffected by this change.
  const sessionId = getCookie(c, "bjhunt_session");

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      const user = await getUserById(session.userId);
      if (user) {
        setAuthContext(c, user);
      }
    }
  }

  await next();
};

/**
 * Require authentication — returns 401 if not authenticated.
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  if (!c.get("userId")) {
    return c.json({ error: "Authentication required" }, 401);
  }
  await next();
};

/**
 * Require platform admin role (a.k.a. super_admin in docs/architecture/09).
 *
 * BJHUNT keeps the schema org-centric (per D2 in the master roadmap) so
 * "super_admin" is implemented as the boolean column `users.is_platform_admin`.
 * The `requireSuperAdmin` alias below exists for spec-compliance with doc 05.
 */
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const user = c.get("user") as AuthUser | undefined;
  if (!user?.isPlatformAdmin) {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
};

/**
 * Spec alias — equivalent to `requireAdmin`. Use this on routes the spec
 * marks as `super_admin` (e.g. DELETE /api/admin/users/:id, PATCH platform settings).
 */
export const requireSuperAdmin = requireAdmin;

/**
 * Require org admin or owner role.
 */
export const requireOrgAdmin: MiddlewareHandler = async (c, next) => {
  const user = c.get("user") as AuthUser | undefined;
  if (!user || !["owner", "admin"].includes(user.role)) {
    return c.json({ error: "Organization admin access required" }, 403);
  }
  await next();
};

// ── Helpers ──────────────────────────────────────────────────────────────

function setAuthContext(c: Context, user: AuthUser) {
  c.set("userId", user.id);
  c.set("orgId", user.orgId);
  c.set("user", user);
}

function getCookie(c: Context, name: string): string | undefined {
  const cookie = c.req.header("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1];
}

async function getUserById(id: string): Promise<AuthUser | null> {
  const [user] = await sql`
    SELECT id, org_id, email, role, is_platform_admin
    FROM users WHERE id = ${id}
  `;
  if (!user) return null;
  return {
    id: user.id as string,
    orgId: user.orgId as string,
    email: user.email as string,
    role: user.role as string,
    isPlatformAdmin: user.isPlatformAdmin as boolean,
  };
}
