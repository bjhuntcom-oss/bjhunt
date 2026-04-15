/**
 * CSRF protection — Origin/Referer header check for state-changing requests.
 * API key requests bypass CSRF (they're already authenticated via header).
 */

import type { MiddlewareHandler } from "hono";
import { config } from "../config.js";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const csrfMiddleware: MiddlewareHandler = async (c, next) => {
  if (!STATE_CHANGING.has(c.req.method)) {
    return next();
  }

  // API key requests bypass CSRF
  const authHeader = c.req.header("authorization") || "";
  if (authHeader.startsWith("Bearer bjk_")) {
    return next();
  }

  const origin = c.req.header("origin");
  if (!origin) {
    return c.json({ error: "Missing Origin header" }, 403);
  }

  if (!config.cors.origins.includes(origin)) {
    return c.json({ error: "Invalid Origin" }, 403);
  }

  await next();
};
