/**
 * CORS middleware — whitelist-based origin validation.
 */

import { cors } from "hono/cors";
import { config } from "../config.js";

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return null;
    return config.cors.origins.includes(origin) ? origin : null;
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  credentials: true,
  maxAge: 3600,
});
