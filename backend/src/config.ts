/**
 * Environment configuration — all secrets from env vars, no defaults.
 */

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const config = {
  port: parseInt(optional("PORT", "3001"), 10),
  env: optional("NODE_ENV", "development"),
  isProduction: optional("NODE_ENV", "development") === "production",

  // PostgreSQL
  database: {
    url: required("DATABASE_URL"),
  },

  // Redis
  redis: {
    url: optional("REDIS_URL", "redis://localhost:6379"),
  },

  // Auth
  auth: {
    sessionSecret: required("SESSION_SECRET"),
    sessionMaxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    apiKeyPrefix: "bjk_",
  },

  // CORS
  cors: {
    origins: optional("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,https://bjhunt.com,https://www.bjhunt.com")
      .split(",")
      .map((s) => s.trim()),
  },

  // LangGraph API
  langgraph: {
    url: optional("LANGGRAPH_URL", "http://localhost:2024"),
    apiSecret: required("BJHUNT_API_SECRET"),
  },

  // Email (Resend)
  email: {
    from: optional("EMAIL_FROM", "BJHUNT <noreply@bjhunt.com>"),
    resendApiKey: process.env.RESEND_API_KEY || "",
    appUrl: optional("APP_URL", "https://bjhunt.com"),
  },

  // Rate limiting
  rateLimit: {
    public: { window: 60, max: 30 },    // 30 req/min for public endpoints
    auth: { window: 300, max: 10 },      // 10 req/5min for auth endpoints
    api: { window: 60, max: 120 },       // 120 req/min for authenticated API
  },
} as const;
