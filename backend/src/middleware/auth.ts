/**
 * Authentication middleware — resolves session or API key to user context.
 */

import type { Context, MiddlewareHandler } from "hono";
import { getSession } from "../auth/session.js";
import { validateApiKey } from "../auth/api-keys.js";
import { sql } from "../db/client.js";

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

  // Try session cookie or session token in Authorization header
  let sessionId = getCookie(c, "bjhunt_session");

  // Fallback: session token in Authorization header or query string
  // Used for cross-origin SSE streams where cookies are SameSite=Lax
  if (!sessionId && authHeader.startsWith("Bearer session:")) {
    sessionId = authHeader.slice(15);
  }
  // Fallback: token in query string (avoids CORS preflight from Authorization header)
  if (!sessionId) {
    const qsToken = new URL(c.req.url).searchParams.get("token");
    if (qsToken) sessionId = qsToken;
  }

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
 * Require platform admin role.
 */
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const user = c.get("user") as AuthUser | undefined;
  if (!user?.isPlatformAdmin) {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
};

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
