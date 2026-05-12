/**
 * Sliding-window rate limiter for Next.js API routes.
 *
 * Per docs/architecture/14-SECURITY.md §Rate Limiting:
 *   Implementation: Redis sliding window (@upstash/ratelimit)
 *
 * Strategy:
 *   - Production (Vercel): Upstash Redis REST (serverless-friendly).
 *     Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 *   - Development (no Upstash configured): in-memory Map fallback so local dev
 *     keeps working. NOT safe across serverless invocations on Vercel.
 *
 * If Upstash is unavailable (network error, quota exceeded):
 *   - in production: fail CLOSED. Public unauthenticated endpoints like
 *     /api/beta and /api/contact would otherwise be wide open to spam if
 *     Upstash hiccups, so we trade availability for safety here.
 *   - in dev: fail OPEN so local development keeps working without an
 *     Upstash account.
 * Same logic applies when the env vars are missing entirely.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: number
  limit: number
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const upstashEnabled = Boolean(UPSTASH_URL && UPSTASH_TOKEN)

const upstashRedis = upstashEnabled
  ? new Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! })
  : null

const limiterCache = new Map<string, Ratelimit>()

function getUpstashLimiter(prefix: string, limit: number, windowMs: number): Ratelimit | null {
  if (!upstashRedis) return null
  const key = `${prefix}:${limit}:${windowMs}`
  let limiter = limiterCache.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: upstashRedis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
      prefix: `bjhunt:rl:${prefix}`,
    })
    limiterCache.set(key, limiter)
  }
  return limiter
}

const memoryStore = new Map<string, { count: number; resetAt: number }>()

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const record = memoryStore.get(key)
  if (!record || record.resetAt <= now) {
    const resetAt = now + windowMs
    memoryStore.set(key, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt, limit }
  }
  if (record.count >= limit) {
    return { success: false, remaining: 0, resetAt: record.resetAt, limit }
  }
  record.count++
  return { success: true, remaining: limit - record.count, resetAt: record.resetAt, limit }
}

/**
 * Apply rate limit to an identifier (typically client IP).
 *
 * @param prefix Logical scope (e.g. "beta", "contact", "auth-login")
 * @param identifier Stable key per requester (typically IP)
 * @param limit Max requests per window
 * @param windowMs Window length in milliseconds
 */
export async function rateLimit(
  prefix: string,
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(prefix, limit, windowMs)
  if (upstash) {
    try {
      const res = await upstash.limit(identifier)
      return {
        success: res.success,
        remaining: res.remaining,
        resetAt: res.reset,
        limit: res.limit,
      }
    } catch (err) {
      // In production we fail CLOSED on a public unauthenticated endpoint —
      // fail-open here is an open door for email/signup spam if Upstash
      // hiccups. In dev we keep the lenient behaviour so the form is testable
      // without an Upstash account.
      console.error(`[rate-limit] Upstash failure on ${prefix}:${identifier}`, err)
      if (process.env.NODE_ENV === 'production') {
        return { success: false, remaining: 0, resetAt: Date.now() + windowMs, limit }
      }
      return { success: true, remaining: limit, resetAt: Date.now() + windowMs, limit }
    }
  }
  // No Upstash configured. In production this means env vars are missing —
  // refuse rather than rely on the per-instance memory store (each Vercel
  // serverless invocation is a fresh process, so memoryStore = no-op).
  if (process.env.NODE_ENV === 'production' && !upstashEnabled) {
    console.error(`[rate-limit] No Upstash configured in production for ${prefix}; refusing`)
    return { success: false, remaining: 0, resetAt: Date.now() + windowMs, limit }
  }
  return memoryLimit(`${prefix}:${identifier}`, limit, windowMs)
}

/**
 * Extract client IP from a Next.js request, with sensible Vercel fallbacks.
 * Trusts x-forwarded-for first hop; falls back to x-real-ip; last resort "unknown".
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}

/**
 * Build standard rate limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
}
