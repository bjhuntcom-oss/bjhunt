/**
 * CSRF protection — Origin/Referer header check for state-changing requests.
 * API key requests bypass CSRF (they're already authenticated via header).
 */

import type { MiddlewareHandler } from "hono";
import { config } from "../config.js";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const CSRF_EXEMPT = new Set(["/api/security/csp-report"]);

function isAllowedOrigin(origin: string): boolean {
  if (config.cors.origins.includes(origin)) return true;
  return origin.endsWith(".bjhunt.com") && origin.startsWith("https://");
}

export const csrfMiddleware: MiddlewareHandler = async (c, next) => {
  if (!STATE_CHANGING.has(c.req.method)) {
    return next();
  }

  if (CSRF_EXEMPT.has(c.req.path)) {
    return next();
  }

  // API key requests bypass CSRF
  const authHeader = c.req.header("authorization") || "";
  if (authHeader.startsWith("Bearer bjk_")) {
    return next();
  }

  const origin = c.req.header("origin");

  // AUTH-P2-1: require Origin on every state-changing browser-cookie request.
  // Previously a missing Origin + presence of bjhunt_session cookie was
  // accepted as "must be a server-side call" — that opened a CSRF gap if
  // an attacker could plant a session cookie via fixation. Browsers send
  // Origin on every cross-site POST per the Fetch spec, and our Next.js
  // server actions set it explicitly via originOverride in
  // lib/backend-client.ts:serverBackendFetch.
  if (!origin) {
    return c.json({ error: "Missing Origin header" }, 403);
  }

  if (!isAllowedOrigin(origin)) {
    return c.json({ error: "Invalid Origin" }, 403);
  }

  await next();
};
