/**
 * CSRF protection — Origin/Referer header check for state-changing requests.
 * API key requests bypass CSRF (they're already authenticated via header).
 */

import type { MiddlewareHandler } from "hono";
import { config } from "../config.js";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Auth endpoints that don't need CSRF (public or cookie-setting)
const CSRF_EXEMPT = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);

export const csrfMiddleware: MiddlewareHandler = async (c, next) => {
  if (!STATE_CHANGING.has(c.req.method)) {
    return next();
  }

  // Auth endpoints are CSRF-exempt (they set/clear cookies)
  if (CSRF_EXEMPT.has(c.req.path)) {
    return next();
  }

  // API key requests bypass CSRF
  const authHeader = c.req.header("authorization") || "";
  if (authHeader.startsWith("Bearer bjk_")) {
    return next();
  }

  const origin = c.req.header("origin");

  // No origin = server-side call (Next.js server actions), allow if authenticated
  if (!origin) {
    const hasCookie = c.req.header("cookie")?.includes("bjhunt_session");
    if (hasCookie) return next();
    return c.json({ error: "Missing Origin header" }, 403);
  }

  if (!config.cors.origins.includes(origin)) {
    return c.json({ error: "Invalid Origin" }, 403);
  }

  await next();
};
