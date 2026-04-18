/**
 * Two-factor authentication routes — TOTP setup, enable, disable, verify.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { sql, withOrg, adminSql } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { config } from "../config.js";
import {
  generateTOTPSecret,
  verifyTOTP,
  generateBackupCodes,
  verifyBackupCode,
} from "../auth/totp.js";
import { createSession } from "../auth/session.js";
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

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Enable 2FA
    await withOrg(user.orgId, (tx) =>
      tx`
        UPDATE users
        SET totp_enabled = true,
            totp_backup_codes = ${backupCodes}
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
      backupCodes,
      message: "Two-factor authentication has been enabled. Save your backup codes securely.",
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

    const [hash, userId, expiryStr] = parts;
    const expiry = parseInt(expiryStr!, 10);

    if (isNaN(expiry) || Date.now() > expiry) {
      return c.json({ error: "Temporary token has expired" }, 401);
    }

    // Verify the hash
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(`${userId}:${config.auth.sessionSecret}:${expiryStr}`);
    const expectedHash = hasher.digest("hex");

    if (hash !== expectedHash) {
      return c.json({ error: "Invalid temporary token" }, 401);
    }

    // Pre-session bootstrap: this lookup runs BEFORE the org context is
    // established (TOTP verification step). Use the BYPASSRLS adminSql pool
    // — same pattern as auth.ts login flow. Per docs/architecture/10 §131-148.
    const uid = userId as string;
    const [user] = await adminSql`
      SELECT id, org_id, email, role, is_platform_admin, totp_secret, totp_enabled, totp_backup_codes
      FROM users WHERE id = ${uid}
    `;

    if (!user || !user.totpEnabled || !user.totpSecret) {
      return c.json({ error: "Invalid temporary token" }, 401);
    }

    const userOrgId = user.orgId as string;

    // Try TOTP code first, then backup code
    let totpValid = verifyTOTP(user.totpSecret as string, code);
    if (!totpValid && user.totpBackupCodes) {
      const remaining = verifyBackupCode(user.totpBackupCodes as string[], code);
      if (remaining !== null) {
        totpValid = true;
        // Consume the backup code — now that we know the orgId, use withOrg.
        await withOrg(userOrgId, (tx) =>
          tx`UPDATE users SET totp_backup_codes = ${remaining as string[]} WHERE id = ${uid}`,
        );
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
