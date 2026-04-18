import type { AppVariables } from "../types.js";
/**
 * Auth routes — register, login, logout, me, password reset.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
// Auth routes operate BEFORE the tenant context is established (login by
// email, session/token lookups, password reset). They need cross-org access
// by definition. Use the BYPASSRLS pool — per docs/architecture/10 §131-148.
import { adminSql as sql } from "../db/client.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { createSession, deleteSession } from "../auth/session.js";
import { config } from "../config.js";
import { rateLimit } from "../middleware/rate-limit.js";
import type { AuthUser } from "../middleware/auth.js";
import { sendEmail } from "../lib/email.js";
import { welcomeEmail, passwordResetEmail, loginNotificationEmail } from "../lib/email-templates.js";

export const authRoutes = new Hono<{ Variables: AppVariables }>();

// ── Schemas ──────────────────────────────────────────────────────────────

// Per docs/architecture/14-SECURITY.md §1 Authentication:
// "Min 10 chars, complexité requise" — at least 1 lowercase, 1 uppercase, 1 digit.
const registerSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128)
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/\d/, "Password must contain at least one digit"),
  displayName: z.string().min(1).max(100).optional(),
  orgName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(1).max(128),
});

// ── Register ─────────────────────────────────────────────────────────────

authRoutes.post(
  "/register",
  rateLimit(config.rateLimit.auth),
  zValidator("json", registerSchema),
  async (c) => {
    const { email, password, displayName, orgName } = c.req.valid("json");

    // Check if email already exists
    const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing) {
      return c.json({ error: "Email already registered" }, 409);
    }

    const passwordHash = await hashPassword(password);
    const slug = email.split("@")[0]!.replace(/[^a-z0-9-]/g, "-").slice(0, 30);

    // Create org + user in a transaction
    const result = await sql.begin(async (tx) => {
      const [org] = await tx`
        INSERT INTO organizations (name, slug)
        VALUES (${orgName || `${slug}'s org`}, ${slug + "-" + Date.now().toString(36)})
        RETURNING id
      `;

      const [user] = await tx`
        INSERT INTO users (org_id, email, password_hash, display_name, role)
        VALUES (${org!.id}, ${email}, ${passwordHash}, ${displayName || null}, 'owner')
        RETURNING id, org_id, email, role, is_platform_admin
      `;

      return user!;
    });

    // Create session
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = c.req.header("user-agent") || null;
    const session = await createSession(result.id as string, ip, ua);

    setSessionCookie(c, session.id, session.expiresAt);

    // Audit log
    await sql`
      INSERT INTO audit_logs (org_id, user_id, action, ip_address)
      VALUES (${result.orgId}, ${result.id}, 'user.register', ${ip})
    `;

    // Send welcome email (fire-and-forget)
    const welcome = welcomeEmail(displayName || email.split("@")[0]!);
    sendEmail({ to: email, subject: welcome.subject, html: welcome.html }).catch(() => {});

    // SECURITY (audit #3-21 / C-13): NEVER include session.id in the JSON
    // body. The session is communicated exclusively via the HttpOnly
    // bjhunt_session cookie set above by setSessionCookie(). Any JSON
    // exposure makes it readable by JS and re-introduces the XSS-to-ATO
    // path we closed in DEEP-AUDIT-2026-04-16.
    return c.json({
      user: {
        id: result.id,
        email: result.email,
        orgId: result.orgId,
        role: result.role,
      },
      organization: { id: result.orgId },
    }, 201);
  },
);

// ── Login ────────────────────────────────────────────────────────────────

authRoutes.post(
  "/login",
  rateLimit(config.rateLimit.auth),
  zValidator("json", loginSchema),
  async (c) => {
    const { email, password } = c.req.valid("json");

    const [user] = await sql`
      SELECT id, org_id, email, password_hash, role, is_platform_admin
      FROM users WHERE email = ${email}
    `;

    if (!user) {
      // Constant-time fake hash to prevent timing attacks
      await hashPassword("fake-password-for-timing");
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const valid = await verifyPassword(user.passwordHash as string, password);
    if (!valid) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    // ── 2FA check ─────────────────────────────────────────────────────
    // If the user has TOTP enabled, do NOT create a session yet.
    // Return a short-lived temp token for the frontend to call /api/auth/2fa/verify.
    const [totpRow] = await sql`
      SELECT totp_enabled FROM users WHERE id = ${user.id}
    `;
    if (totpRow?.totpEnabled) {
      const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
      const hasher = new Bun.CryptoHasher("sha256");
      hasher.update(`${user.id}:${config.auth.sessionSecret}:${expiry}`);
      const hash = hasher.digest("hex");
      const tempToken = `${hash}:${user.id}:${expiry}`;

      return c.json({
        requiresTwoFactor: true,
        tempToken,
      });
    }

    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = c.req.header("user-agent") || null;
    const session = await createSession(user.id as string, ip, ua);

    setSessionCookie(c, session.id, session.expiresAt);

    await sql`
      INSERT INTO audit_logs (org_id, user_id, action, ip_address)
      VALUES (${user.orgId}, ${user.id}, 'user.login', ${ip})
    `;

    // Send login notification email (fire-and-forget)
    const loginAlert = loginNotificationEmail(
      email.split("@")[0]!,
      ip || "Unknown",
      ua || "Unknown",
      new Date().toISOString(),
    );
    sendEmail({ to: email, subject: loginAlert.subject, html: loginAlert.html }).catch(() => {});

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

// ── Logout ───────────────────────────────────────────────────────────────

authRoutes.post("/logout", async (c) => {
  const sessionId = getCookie(c, "bjhunt_session");
  if (sessionId) {
    await deleteSession(sessionId);
  }

  // Clear the HttpOnly session cookie, plus any legacy JS-readable
  // duplicates that may still exist on pre-C-13 clients.
  // Hono's c.header() with append: true lets us emit multiple Set-Cookie
  // entries on a single response.
  c.header(
    "Set-Cookie",
    `bjhunt_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  c.header(
    "Set-Cookie",
    `bjhunt_stream_token=; Path=/; SameSite=Lax; Max-Age=0`,
    { append: true },
  );

  return c.json({ ok: true });
});

// ── Me (current user) ────────────────────────────────────────────────────

authRoutes.get("/me", async (c) => {
  const user = c.get("user") as AuthUser | undefined;
  if (!user) {
    return c.json({ user: null });
  }

  // Fetch displayName from DB
  const [dbUser] = await sql`SELECT display_name FROM users WHERE id = ${user.id}`;
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.isPlatformAdmin ? "platform_admin" : user.role,
      displayName: (dbUser?.displayName as string) || user.email.split("@")[0],
      isPlatformAdmin: user.isPlatformAdmin,
    },
  });
});

// ── Update me (display name) ────────────────────────────────────────────

const updateMeSchema = z.object({
  displayName: z.string().min(1).max(100).trim(),
});

authRoutes.patch(
  "/me",
  zValidator("json", updateMeSchema),
  async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const { displayName } = c.req.valid("json");

    await sql`UPDATE users SET display_name = ${displayName} WHERE id = ${user.id}`;

    await sql`
      INSERT INTO audit_logs (org_id, user_id, action)
      VALUES (${user.orgId}, ${user.id}, 'user.update_display_name')
    `;

    return c.json({ ok: true, displayName });
  },
);

// ── Forgot password ──────────────────────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
});

authRoutes.post(
  "/forgot-password",
  rateLimit(config.rateLimit.auth),
  zValidator("json", forgotPasswordSchema),
  async (c) => {
    const { email } = c.req.valid("json");

    // Always return success to prevent email enumeration
    const [user] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (user) {
      const { nanoid } = await import("nanoid");
      const token = nanoid(48);
      const hasher = new Bun.CryptoHasher("sha256");
      hasher.update(token);
      const tokenHash = hasher.digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await sql`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${tokenHash}, ${expiresAt})
      `;

      // Send password reset email
      const resetUrl = `${config.email.appUrl}/reset-password?token=${token}`;
      const resetEmail = passwordResetEmail(email.split("@")[0]!, resetUrl);
      sendEmail({ to: email, subject: resetEmail.subject, html: resetEmail.html }).catch(() => {});

      if (!config.isProduction) {
        console.log(`[DEV] Password reset token for ${email}: ${token}`);
      }
    }

    return c.json({ ok: true, message: "If that email exists, a reset link has been sent." });
  },
);

// ── Reset password ──────────────────────────────────────────────────────

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

authRoutes.post(
  "/reset-password",
  rateLimit(config.rateLimit.auth),
  zValidator("json", resetPasswordSchema),
  async (c) => {
    const { token, newPassword } = c.req.valid("json");

    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(token);
    const tokenHash = hasher.digest("hex");

    const [resetToken] = await sql`
      SELECT id, user_id FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
        AND expires_at > now()
        AND used_at IS NULL
    `;

    if (!resetToken) {
      return c.json({ error: "Invalid or expired reset token" }, 400);
    }

    const newHash = await hashPassword(newPassword);

    await sql.begin(async (tx) => {
      await tx`UPDATE users SET password_hash = ${newHash} WHERE id = ${resetToken.userId}`;
      await tx`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${resetToken.id}`;
    });

    await sql`
      INSERT INTO audit_logs (user_id, action)
      VALUES (${resetToken.userId}, 'user.reset_password')
    `;

    return c.json({ ok: true });
  },
);

// ── Change password ──────────────────────────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

authRoutes.post(
  "/change-password",
  rateLimit(config.rateLimit.auth),
  zValidator("json", changePasswordSchema),
  async (c) => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) return c.json({ error: "Authentication required" }, 401);

    const { currentPassword, newPassword } = c.req.valid("json");

    const [dbUser] = await sql`
      SELECT password_hash FROM users WHERE id = ${user.id}
    `;
    if (!dbUser) return c.json({ error: "User not found" }, 404);

    const valid = await verifyPassword(dbUser.passwordHash as string, currentPassword);
    if (!valid) return c.json({ error: "Current password is incorrect" }, 401);

    const newHash = await hashPassword(newPassword);
    await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${user.id}`;

    await sql`
      INSERT INTO audit_logs (org_id, user_id, action)
      VALUES (${user.orgId}, ${user.id}, 'user.change_password')
    `;

    return c.json({ ok: true });
  },
);

// ── Helpers ──────────────────────────────────────────────────────────────

function setSessionCookie(c: any, sessionId: string, expiresAt: Date) {
  const secure = config.isProduction ? "; Secure" : "";
  c.header(
    "Set-Cookie",
    `bjhunt_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax${secure}; Expires=${expiresAt.toUTCString()}`,
  );
}

function getCookie(c: any, name: string): string | undefined {
  const cookie = c.req.header("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1];
}
