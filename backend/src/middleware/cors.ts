/**
 * CORS middleware — whitelist-based origin validation.
 *
 * Allows exact matches from CORS_ORIGINS env var, plus any *.bjhunt.com
 * subdomain in production (e.g. api.bjhunt.com, chat.bjhunt.com).
 */

import { cors } from "hono/cors";
import { config } from "../config.js";

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return null;

    // Exact match from configured origins
    if (config.cors.origins.includes(origin)) return origin;

    // Allow any *.bjhunt.com subdomain over HTTPS
    if (origin.endsWith(".bjhunt.com") && origin.startsWith("https://")) {
      return origin;
    }

    // Reject everything else — return null so the browser blocks the request
    return null;
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Conversation-Id"],
  exposeHeaders: ["X-Conversation-Id", "X-Request-ID"],
  credentials: true,
  maxAge: 86400, // 24 hours — reduce preflight chatter
});
