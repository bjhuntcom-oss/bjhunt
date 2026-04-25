/**
 * Redis-backed rate limiting middleware.
 * Uses sliding window counter per IP (or per user for authenticated routes).
 */

import type { Context, MiddlewareHandler } from "hono";
import { Redis } from "ioredis";
import { config } from "../config.js";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
  }
  return redis;
}

interface RateLimitConfig {
  window: number; // seconds
  max: number;    // max requests per window
}

export function rateLimit(cfg: RateLimitConfig): MiddlewareHandler {
  return async (c: Context, next) => {
    const r = getRedis();
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userId = c.get("userId") as string | undefined;
    const key = `rl:${userId || ip}:${c.req.path}`;

    try {
      const count = await r.incr(key);
      if (count === 1) {
        await r.expire(key, cfg.window);
      }

      c.header("X-RateLimit-Limit", cfg.max.toString());
      c.header("X-RateLimit-Remaining", Math.max(0, cfg.max - count).toString());

      if (count > cfg.max) {
        return c.json({ error: "Too many requests" }, 429);
      }
    } catch {
      // If Redis is down, fail open — don't block requests
    }

    await next();
  };
}

/**
 * ENG-P1-6: per-API-key sliding-window rate limit, scoped by api_key_id
 * rather than (org, ip, user). Stops a leaked key from consuming the whole
 * org quota. Read api_key_id from c.get("apiKeyId") set by validateApiKey
 * upstream. Falls open if api_key_id missing OR Redis down.
 */
export function rateLimitPerApiKey(cfg: RateLimitConfig): MiddlewareHandler {
  return async (c: Context, next) => {
    const apiKeyId = c.get("apiKeyId" as never) as string | undefined;
    if (!apiKeyId) return next();
    const r = getRedis();
    const key = `rl-key:${apiKeyId}`;
    try {
      const count = await r.incr(key);
      if (count === 1) await r.expire(key, cfg.window);
      c.header("X-RateLimit-Key-Limit", cfg.max.toString());
      c.header("X-RateLimit-Key-Remaining", Math.max(0, cfg.max - count).toString());
      if (count > cfg.max) {
        return c.json(
          {
            error: "api_key_rate_limited",
            message: `API key exceeded ${cfg.max} requests / ${cfg.window}s. Slow down or rotate workload across keys.`,
          },
          429,
        );
      }
    } catch {
      // fail-open
    }
    await next();
  };
}
