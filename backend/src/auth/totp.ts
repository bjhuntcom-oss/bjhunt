/**
 * TOTP (Time-Based One-Time Password) utilities for 2FA.
 *
 * Uses the otpauth library (RFC 6238) with SHA-1, 6 digits, 30s period.
 */

import { TOTP, Secret } from "otpauth";
import { nanoid } from "nanoid";

const ISSUER = "BJHUNT";
const DIGITS = 6;
const PERIOD = 30;
const ALGORITHM = "SHA1";

/**
 * Generate a new TOTP secret and provisioning URI for QR code enrollment.
 */
export function generateTOTPSecret(email: string): {
  secret: string;
  uri: string;
  qrDataUrl: string;
} {
  const secret = new Secret({ size: 20 });

  const totp = new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret,
  });

  const uri = totp.toString();

  // Return the otpauth:// URI — frontend can render QR from this
  return {
    secret: secret.base32,
    uri,
    // The frontend should use a QR library to render this URI.
    // We pass the URI as qrDataUrl for convenience (not an actual data URL).
    qrDataUrl: uri,
  };
}

/**
 * Verify a 6-digit TOTP code against a base32-encoded secret.
 * Allows a window of +/- 1 period (30s) to handle clock skew.
 */
export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new TOTP({
    issuer: ISSUER,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: Secret.fromBase32(secret),
  });

  // delta returns null if invalid, or the time step difference
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

/**
 * Generate 10 single-use backup codes (format: xxxx-xxxx).
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raw = nanoid(8).toLowerCase().replace(/[^a-z0-9]/g, "x");
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

/**
 * Verify a backup code against the stored list.
 * Returns the remaining codes (with the used one removed), or null if invalid.
 */
export function verifyBackupCode(
  codes: string[],
  code: string,
): string[] | null {
  const normalized = code.trim().toLowerCase();
  const idx = codes.findIndex((c) => c === normalized);
  if (idx === -1) return null;

  // Remove the used code
  const remaining = [...codes];
  remaining.splice(idx, 1);
  return remaining;
}
