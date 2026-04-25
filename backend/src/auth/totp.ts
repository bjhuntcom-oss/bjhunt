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
 * Hash a backup code with SHA-256 (no salt — backup codes are random 8-char
 * nanoid pieces, not user-chosen secrets, so no rainbow-table risk).
 */
export function hashBackupCode(code: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(code.trim().toLowerCase());
  return hasher.digest("hex");
}

/**
 * Generate 10 single-use backup codes (format: xxxx-xxxx).
 *
 * Returns BOTH:
 *   - `codes`  : plaintext to display ONCE to the user (never stored)
 *   - `hashes` : SHA-256 hashes to persist in `users.totp_backup_codes`
 *
 * Per DOC-09 audit P1: previous implementation stored plaintext — leak of
 * the DB row would expose the codes. Hashing makes the stored value useless
 * to an attacker without the original code value.
 */
export function generateBackupCodes(): { codes: string[]; hashes: string[] } {
  const codes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < 10; i++) {
    // AUTH-P2-4: bump from nanoid(8) (~47 bits) to nanoid(12) (~71 bits).
    // Replacing `[^a-z0-9]` with 'x' costs entropy — by drawing from a
    // 36-char alphabet we keep 12*log2(36) ≈ 62 bits even after the
    // forced-to-lowercase coercion, well above the 50-bit floor for a
    // single-use offline secret.
    const raw = nanoid(12).toLowerCase().replace(/[^a-z0-9]/g, "x");
    const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    codes.push(code);
    hashes.push(hashBackupCode(code));
  }
  return { codes, hashes };
}

/**
 * Verify a backup code against the stored list of hashes.
 * Returns the remaining hashes (with the used one removed), or null if invalid.
 *
 * Constant-time comparison via SHA-256 hash equality — no early exit on
 * mismatch reveals the position of valid codes.
 */
export function verifyBackupCode(
  storedHashes: string[],
  code: string,
): string[] | null {
  const candidate = hashBackupCode(code);
  let matchedIndex = -1;
  // Constant-iteration scan — never early-exit.
  for (let i = 0; i < storedHashes.length; i++) {
    if (timingSafeEqual(storedHashes[i] ?? "", candidate)) {
      matchedIndex = i;
    }
  }
  if (matchedIndex === -1) return null;
  const remaining = [...storedHashes];
  remaining.splice(matchedIndex, 1);
  return remaining;
}

/** Constant-time hex string comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
