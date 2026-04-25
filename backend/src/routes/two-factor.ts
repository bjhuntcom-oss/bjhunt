/**
 * Two-factor authentication routes — TOTP setup, enable, disable, verify.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Redis } from "ioredis";
import { withOrg, adminSql } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { config } from "../config.js";
import {
  generateTOTPSecret,
  verifyTOTP,
  generateBackupCodes,
  verifyBackupCode,
  hashBackupCode,
} from "../auth/totp.js";
import { createSession } from "../auth/session.js";

// AUTH-P1-4: lazy Redis singleton scoped to this module — tempToken
// replay protection lives here only.
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(config.redis.url, { maxRetriesPerRequest: 1, lazyConnect: true });
  }
  return _redis;
}
const TEMP_TOKEN_MAX_ATTEMPTS = 3;
import type { AppVariables } from "../types.js";
import type { AuthUser } from "../middleware/auth.js";

export const twoFactorRoutes = new Hono<{ Variables: AppVariables }>();

// ── Schemas ──────────────────────────────────────────────────────────────

const totpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Must be a 6-digit code"),
});

const disableSchema = z.object({
  code: z.string().min(1, "Code is required"),
});

const verifySchema = z.object({
  code: z.string().min(1, "Code is required"),
  tempToken: z.string().min(1, "Temporary token is required"),
});

// ── POST /setup — Generate TOTP secret for enrollment ───────────────────

twoFactorRoutes.post("/setup", requireAuth, async (c) => {
  const user = c.get("user") as AuthUser;

  // Check if 2FA is already enabled (users is under RLS FORCE — use withOrg).
  const [dbUser] = await withOrg(user.orgId, (tx) =>
    tx`SELECT totp_enabled FROM users WHERE id = ${user.id}`,
  );
  if (dbUser?.totpEnabled) {
    return c.json({ error: "Two-factor authentication is already enabled" }, 400);
  }

  const { secret, uri, qrDataUrl } = generateTOTPSecret(user.email);

  // Store the secret temporarily (not yet enabled)
  await withOrg(user.orgId, (tx) =>
    tx`UPDATE users SET totp_secret = ${secret} WHERE id = ${user.id}`,
  );

  await withOrg(user.orgId, (tx) =>
    tx`
      INSERT INTO audit_logs (org_id, user_id, action)
      VALUES (${user.orgId}, ${user.id}, 'user.2fa_setup_initiated')
    `,
  );

  return c.json({ secret, uri, qrDataUrl });
});

// ── POST /enable — Verify code and enable 2FA ───────────────────────────

twoFactorRoutes.post(
  "/enable",
  requireAuth,
  zValidator("json", totpCodeSchema),
  async (c) => {
    const user = c.get("user") as AuthUser;
    const { code } = c.req.valid("json");

    // Get the pending secret (users is under RLS FORCE — use withOrg).
    const [dbUser] = await withOrg(user.orgId, (tx) =>
      tx`SELECT totp_secret, totp_enabled FROM users WHERE id = ${user.id}`,
    );

    if (!dbUser?.totpSecret) {
      return c.json({ error: "No 2FA setup in progress. Call /setup first." }, 400);
    }
    if (dbUser.totpEnabled) {
      return c.json({ error: "Two-factor authentication is already enabled" }, 400);
    }

    // Verify the code against the pending secret
    const valid = verifyTOTP(dbUser.totpSecret as string, code);
    if (!valid) {
      return c.json({ error: "Invalid verification code" }, 400);
    }

    // Generate backup codes — plaintext returned ONCE, hashes persisted.
    const { codes: backupCodes, hashes: backupHashes } = generateBackupCodes();

    // Enable 2FA — store ONLY the SHA-256 hashes (DOC-09 P1 audit fix).
    await withOrg(user.orgId, (tx) =>
      tx`
        UPDATE users
        SET totp_enabled = true,
            totp_backup_codes = ${backupHashes}
        WHERE id = ${user.id}
      `,
    );

    await withOrg(user.orgId, (tx) =>
      tx`
        INSERT INTO audit_logs (org_id, user_id, action)
        VALUES (${user.orgId}, ${user.id}, 'user.2fa_enabled')
      `,
    );

    return c.json({
      enabled: true,
      backupCodes, // shown ONCE to the user — never recoverable
      message: "Two-factor authentication has been enabled. Save your backup codes securely — they will not be displayed again.",
    });
  },
);

// ── POST /disable — Disable 2FA ────────────────────────────────────────

twoFactorRoutes.post(
  "/disable",
  requireAuth,
  zValidator("json", disableSchema),
  async (c) => {
    const user = c.get("user") as AuthUser;
    const { code } = c.req.valid("json");

    const [dbUser] = await withOrg(user.orgId, (tx) =>
      tx`SELECT totp_secret, totp_enabled, totp_backup_codes FROM users WHERE id = ${user.id}`,
    );

    if (!dbUser?.totpEnabled) {
      return c.json({ error: "Two-factor authentication is not enabled" }, 400);
    }

    // Accept either a TOTP code or a backup code
    const totpValid = verifyTOTP(dbUser.totpSecret as string, code);
    let backupValid = false;
    if (!totpValid && dbUser.totpBackupCodes) {
      const remaining = verifyBackupCode(dbUser.totpBackupCodes as string[], code);
      backupValid = remaining !== null;
    }

    if (!totpValid && !backupValid) {
      return c.json({ error: "Invalid verification code" }, 400);
    }

    // Disable 2FA and clear secrets
    await withOrg(user.orgId, (tx) =>
      tx`
        UPDATE users
        SET totp_enabled = false,
            totp_secret = NULL,
            totp_backup_codes = NULL
        WHERE id = ${user.id}
      `,
    );

    await withOrg(user.orgId, (tx) =>
      tx`
        INSERT INTO audit_logs (org_id, user_id, action)
        VALUES (${user.orgId}, ${user.id}, 'user.2fa_disabled')
      `,
    );

    return c.json({ disabled: true });
  },
);

// ── POST /verify — Verify TOTP during login flow ───────────────────────

twoFactorRoutes.post(
  "/verify",
  rateLimit(config.rateLimit.auth),
  zValidator("json", verifySchema),
  async (c) => {
    const { code, tempToken } = c.req.valid("json");

    // Validate the temp token from Redis or inline signed token
    // The temp token format is: sha256(userId + sessionSecret + expiry):userId:expiry
    const parts = tempToken.split(":");
    if (parts.length !== 3) {
      return c.json({ error: "Invalid temporary token" }, 401);
    }

    const [hash, userId, expiryStr] = parts as [string, string, string];
    const expiry = Number.parseInt(expiryStr, 10);

    if (Number.isNaN(expiry) || Date.now() > expiry) {
      return c.json({ error: "Temporary token has expired" }, 401);
    }

    // Verify the hash
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(`${userId}:${config.auth.sessionSecret}:${expiryStr}`);
    const expectedHash = hasher.digest("hex");

    if (hash !== expectedHash) {
      return c.json({ error: "Invalid temporary token" }, 401);
    }

    // AUTH-P1-4: per-tempToken replay/brute-force guard. Cap each
    // tempToken at TEMP_TOKEN_MAX_ATTEMPTS verify attempts and refuse
    // any reuse after a successful verify (we delete the key below on
    // success). Falls open if Redis is unavailable so legitimate users
    // don't get locked out by an infra blip — generic auth rate-limit
    // upstream still applies.
    const tokenKey = `2fa-token:${hash}`;
    try {
      const r = getRedis();
      const used = await r.get(tokenKey);
      if (used === "consumed") {
        return c.json({ error: "Temporary token already used" }, 401);
      }
      const attempts = await r.incr(tokenKey);
      if (attempts === 1) {
        // Pin TTL to the original token expiry so the counter doesn't
        // outlive the token itself.
        const ttl = Math.max(60, Math.floor((expiry - Date.now()) / 1000));
        await r.expire(tokenKey, ttl);
      }
      if (attempts > TEMP_TOKEN_MAX_ATTEMPTS) {
        return c.json(
          { error: "Too many verification attempts. Please log in again." },
          429,
        );
      }
    } catch {
      // Redis down → continue. Better availability than a hard fail here.
    }

    // Pre-session bootstrap: this lookup runs BEFORE the org context is
    // established (TOTP verification step). Use the BYPASSRLS adminSql pool
    // — same pattern as auth.ts login flow. Per docs/architecture/10 §131-148.
    const uid = userId as string;
    const [user] = await adminSql`
      SELECT id, org_id, email, role, is_platform_admin, totp_secret, totp_enabled, totp_backup_codes
      FROM users WHERE id = ${uid}
    `;

    if (!user?.totpEnabled || !user.totpSecret) {
      return c.json({ error: "Invalid temporary token" }, 401);
    }

    const userOrgId = user.orgId as string;

    // Try TOTP code first, then backup code
    let totpValid = verifyTOTP(user.totpSecret as string, code);
    if (!totpValid && user.totpBackupCodes) {
      // AUTH-P1-3: atomic verify+remove in a single SQL statement so two
      // concurrent verify requests with the same code cannot both succeed.
      // Previous implementation read codes, removed one in JS, wrote back —
      // a textbook lost-update race that effectively gave a single code two
      // authentications.
      const candidateHash = hashBackupCode(code);
      const removed = await withOrg(userOrgId, (tx) =>
        tx`
          UPDATE users
             SET totp_backup_codes = array_remove(totp_backup_codes, ${candidateHash})
           WHERE id = ${uid}
             AND ${candidateHash} = ANY(totp_backup_codes)
          RETURNING id
        `,
      );
      if (removed.length === 1) {
        totpValid = true;
      }
    }

    if (!totpValid) {
      await withOrg(userOrgId, (tx) =>
        tx`
          INSERT INTO audit_logs (org_id, user_id, action, details)
          VALUES (${userOrgId}, ${user.id}, 'user.2fa_verify_failed', '{"reason":"invalid_code"}'::jsonb)
        `,
      );
      return c.json({ error: "Invalid verification code" }, 401);
    }

    // AUTH-P1-4: mark the tempToken as consumed so it cannot replay.
    try {
      const r = getRedis();
      const ttl = Math.max(60, Math.floor((expiry - Date.now()) / 1000));
      await r.set(tokenKey, "consumed", "EX", ttl);
    } catch {
      // best-effort; the cookie below still authenticates
    }

    // Create the real session
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = c.req.header("user-agent") || null;
    const session = await createSession(user.id as string, ip, ua);

    // Set session cookie
    const secure = config.isProduction ? "; Secure" : "";
    c.header(
      "Set-Cookie",
      `bjhunt_session=${session.id}; Path=/; HttpOnly; SameSite=Lax${secure}; Expires=${session.expiresAt.toUTCString()}`,
    );

    await withOrg(userOrgId, (tx) =>
      tx`
        INSERT INTO audit_logs (org_id, user_id, action, ip_address)
        VALUES (${userOrgId}, ${user.id}, 'user.login_2fa_verified', ${ip})
      `,
    );

    // SECURITY (audit #3-21 / C-13): session.id stays in the HttpOnly
    // cookie only. Do not echo it in JSON.
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        orgId: user.orgId,
        role: user.role,
      },
      organization: { id: user.orgId },
    });
  },
);
