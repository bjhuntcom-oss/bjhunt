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
