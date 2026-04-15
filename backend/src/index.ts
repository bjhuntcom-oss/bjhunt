/**
 * BJHUNT Backend — Hono + Bun API server.
 *
 * Orchestrates the BJHUNT ALPHA 1.0 engine, manages auth, RBAC,
 * engagements, and proxies chat streaming from LangGraph.
 */

import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { AppVariables } from "./types.js";

import { config } from "./config.js";
import { corsMiddleware } from "./middleware/cors.js";
import { csrfMiddleware } from "./middleware/csrf.js";
import { resolveAuth } from "./middleware/auth.js";
import { requestId } from "./middleware/request-id.js";

import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { engagementRoutes } from "./routes/engagements.js";
import { chatRoutes } from "./routes/chat.js";
import { apiKeyRoutes } from "./routes/api-keys.js";
import { adminUserRoutes } from "./routes/admin/users.js";
import { adminSettingsRoutes } from "./routes/admin/settings.js";
import { gatewayRoutes, ollamaRoutes } from "./routes/admin/gateway.js";
import { agentRoutes } from "./routes/admin/agents.js";
import { notificationRoutes } from "./routes/notifications.js";
import { dashboardRoutes } from "./routes/dashboard.js";

const app = new Hono<{ Variables: AppVariables }>();

// ── Global middleware ────────────────────────────────────────────────────

app.use("*", requestId);
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", corsMiddleware);
app.use("*", csrfMiddleware);
app.use("*", resolveAuth);

// ── Routes ───────────────────────────────────────────────────────────────

// Health (no auth required)
app.route("/api/health", healthRoutes);

// Auth
app.route("/api/auth", authRoutes);

// Authenticated API routes
app.route("/api/engagements", engagementRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/keys", apiKeyRoutes);
app.route("/api/notifications", notificationRoutes);
app.route("/api/dashboard", dashboardRoutes);

// Admin routes (platform admin only)
app.route("/api/admin/users", adminUserRoutes);
app.route("/api/admin/settings", adminSettingsRoutes);
app.route("/api/admin/gateway", gatewayRoutes);
app.route("/api/admin/ollama", ollamaRoutes);
app.route("/api/admin/agents", agentRoutes);

// ── 404 fallback ─────────────────────────────────────────────────────────

app.notFound((c) => c.json({ error: "Not found" }, 404));

// ── Global error handler ─────────────────────────────────────────────────

app.onError((err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err);

  if (err.message.includes("validation")) {
    return c.json({ error: "Validation error", details: err.message }, 400);
  }

  return c.json(
    { error: config.isProduction ? "Internal server error" : err.message },
    500,
  );
});

// ── Start server ─────────────────────────────────────────────────────────

console.log(`BJHUNT Backend starting on port ${config.port}...`);
console.log(`Environment: ${config.env}`);

export default {
  port: config.port,
  fetch: app.fetch,
};
