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
import { isAppError } from "./lib/errors.js";

import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { engagementRoutes } from "./routes/engagements.js";
import { chatRoutes } from "./routes/chat.js";
import { apiKeyRoutes } from "./routes/api-keys.js";
import { adminUserRoutes } from "./routes/admin/users.js";
import { adminSettingsRoutes } from "./routes/admin/settings.js";
import { gatewayRoutes, ollamaRoutes } from "./routes/admin/gateway.js";
import { agentRoutes } from "./routes/admin/agents.js";
import { adminLogsRoutes } from "./routes/admin/logs.js";
import { adminMonitoringRoutes } from "./routes/admin/monitoring.js";
import { securityRoutes } from "./routes/security.js";
import { notificationRoutes } from "./routes/notifications.js";
import { publicApiRoutes } from "./routes/public-api.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { billingRoutes } from "./routes/billing.js";
import { twoFactorRoutes } from "./routes/two-factor.js";
import { findingsRoutes } from "./routes/findings.js";
import { reportRoutes } from "./routes/reports.js";
import { cveRoutes } from "./routes/cve.js";
import { skillRoutes } from "./routes/skills.js";
import { toolRoutes } from "./routes/tools.js";

const app = new Hono<{ Variables: AppVariables }>();

// ── Global middleware ────────────────────────────────────────────────────

app.use("*", requestId);
app.use("*", logger());
app.use("*", corsMiddleware);
app.use("*", secureHeaders({
  strictTransportSecurity: "max-age=31536000; includeSubDomains",
  xContentTypeOptions: "nosniff",
  xFrameOptions: "DENY",
  referrerPolicy: "strict-origin-when-cross-origin",
  crossOriginOpenerPolicy: "same-origin",
  crossOriginResourcePolicy: "same-origin",
}));
app.use("*", csrfMiddleware);
app.use("*", resolveAuth);

// ── Routes ───────────────────────────────────────────────────────────────

// Health (no auth required)
app.route("/api/health", healthRoutes);

// Auth
app.route("/api/auth", authRoutes);
app.route("/api/auth/2fa", twoFactorRoutes);

// Authenticated API routes
app.route("/api/engagements", engagementRoutes);
app.route("/api/findings", findingsRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/keys", apiKeyRoutes);
// Spec-compliant alias per docs/architecture/05-BACKEND-API.md §API Keys
app.route("/api/api-keys", apiKeyRoutes);
app.route("/api/notifications", notificationRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/billing", billingRoutes);
app.route("/api/reports", reportRoutes);
app.route("/api/cve", cveRoutes);
app.route("/api/skills", skillRoutes);
app.route("/api/tools", toolRoutes);

// Public API v1 (API key auth)
app.route("/api/v1", publicApiRoutes);

// Security telemetry sink (CSP violation reports — no auth, browsers post).
app.route("/api/security", securityRoutes);

// Admin routes (platform admin only)
app.route("/api/admin/users", adminUserRoutes);
app.route("/api/admin/settings", adminSettingsRoutes);
app.route("/api/admin/gateway", gatewayRoutes);
app.route("/api/admin/ollama", ollamaRoutes);
app.route("/api/admin/agents", agentRoutes);
app.route("/api/admin/logs", adminLogsRoutes);
app.route("/api/admin/monitoring", adminMonitoringRoutes);

// ── 404 fallback ─────────────────────────────────────────────────────────

app.notFound((c) => c.json({ error: "Not found" }, 404));

// ── Global error handler ─────────────────────────────────────────────────
// Per docs/architecture/05-BACKEND-API.md §Error Handling.
// Throwing an AppError subclass from a route handler short-circuits to the
// standardised JSON envelope: { error: { code, message, details? } }.

app.onError((err, c) => {
  // Structured logging — request ID is set by the requestId middleware.
  const reqId = c.get("requestId") as string | undefined;
  console.error(
    JSON.stringify({
      level: "error",
      reqId,
      method: c.req.method,
      path: c.req.path,
      message: err.message,
      name: err.name,
    }),
  );

  if (isAppError(err)) {
    return c.json(err.toJSON(), err.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500 | 501 | 502 | 503);
  }

  // Legacy fallback for raw Error / Zod errors not yet wrapped in AppError.
  if (err.message.includes("validation")) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: err.message } },
      400,
    );
  }

  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: config.isProduction ? "Internal server error" : err.message,
      },
    },
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
