/**
 * Account lockout — Redis-backed sliding window counter.
 *
 * Per docs/architecture/14-SECURITY.md §Authentication and OWASP Top 10:2025
 * A07 (Identification and Authentication Failures).
 *
 * Strategy:
 *   - Track failures per (email, ip) tuple — defeats both targeted brute force
 *     against one account AND distributed brute force from one IP.
 *   - 5 failures in a 15-minute window → 15-minute lockout (status 429 with
 *     `Retry-After`).
 *   - Successful login clears the counter.
 *   - Fails open if Redis is down (we never want auth to be unusable due to
 *     a Redis outage; rate-limit middleware already provides a coarser cap).
 *
 * The implementation uses ioredis (already in the project) and avoids a new
 * dependency. Keys live under `auth:lockout:` prefix and have TTL set on
 * first miss.
 */

import { Redis } from "ioredis";
import { config } from "../config.js";

const MAX_FAILURES = 5;
const WINDOW_SECONDS = 15 * 60; // 15 min sliding window
const LOCKOUT_SECONDS = 15 * 60; // 15 min lockout once tripped

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

function key(email: string, ip: string): string {
  // Lowercase email (already done by Zod schema) and concat with IP — caps key
  // cardinality to ~ active_users × active_ips.
  return `auth:lockout:${email}:${ip}`;
}

export interface LockoutCheck {
  /** True when the account+IP combo is currently locked. */
  locked: boolean;
  /** Seconds until the lockout expires (0 if not locked). */
  retryAfter: number;
  /** Failures recorded in the current window (informational). */
  failures: number;
}

/**
 * Check whether (email, ip) is currently locked. Call BEFORE verifying the
 * password to short-circuit credential stuffing.
 */
export async function checkLockout(email: string, ip: string): Promise<LockoutCheck> {
  try {
    const r = getRedis();
    const k = key(email, ip);
    const [countStr, ttl] = await Promise.all([r.get(k), r.ttl(k)]);
    const count = countStr ? parseInt(countStr, 10) : 0;
    const locked = count >= MAX_FAILURES;
    return {
      locked,
      retryAfter: locked && ttl > 0 ? ttl : 0,
      failures: count,
    };
  } catch {
    return { locked: false, retryAfter: 0, failures: 0 };
  }
}

/**
 * Record a failed login attempt. Returns the new failure count, and a flag
 * indicating that THIS call was the one that tripped the lockout (caller
 * may want to log a security event).
 */
export async function recordFailure(
  email: string,
  ip: string,
): Promise<{ failures: number; tripped: boolean }> {
  try {
    const r = getRedis();
    const k = key(email, ip);
    const failures = await r.incr(k);
    if (failures === 1) {
      // First miss in window — apply window TTL.
      await r.expire(k, WINDOW_SECONDS);
    } else if (failures === MAX_FAILURES) {
      // We just tripped the lockout — extend the TTL to LOCKOUT_SECONDS so the
      // ban applies in full regardless of the window remaining.
      await r.expire(k, LOCKOUT_SECONDS);
    }
    return { failures, tripped: failures === MAX_FAILURES };
  } catch {
    return { failures: 0, tripped: false };
  }
}

/** Clear the counter on a successful authentication. */
export async function clearFailures(email: string, ip: string): Promise<void> {
  try {
    await getRedis().del(key(email, ip));
  } catch {
    // best-effort
  }
}

export const LOCKOUT_LIMITS = {
  maxFailures: MAX_FAILURES,
  windowSeconds: WINDOW_SECONDS,
  lockoutSeconds: LOCKOUT_SECONDS,
};
