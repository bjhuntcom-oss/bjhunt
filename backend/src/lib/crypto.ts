/**
 * Symmetric encryption utilities for secrets at rest — AES-256-GCM.
 *
 * Used by the admin gateway to encrypt provider API keys (Anthropic, OpenAI,
 * Ollama Cloud, etc.) before they hit PostgreSQL. A DB dump must not leak
 * plaintext provider credentials (see audit Finding #3-36 / C-14, CWE-312).
 *
 * Key source:
 *   - Production: `ENCRYPTION_KEY` env var (32-byte base64). REQUIRED — the
 *     module throws at import-time if it is missing.
 *   - Non-production: derived from `SESSION_SECRET` via SHA-256 with a
 *     versioned label. This keeps dev/test ergonomic without committing
 *     another secret, but should NEVER run in production.
 *
 * Format on disk: "<iv_b64>:<ciphertext_b64>:<authTag_b64>" — three
 * colon-separated base64 chunks. IV is 12 bytes (GCM standard), auth tag
 * is 16 bytes, ciphertext length matches plaintext length.
 */

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;    // 96 bits — GCM recommended
const KEY_LEN = 32;   // 256 bits
const KDF_LABEL = ":encryption-v1";

let cachedKey: Buffer | null = null;

/**
 * Resolve the 32-byte encryption key. Called lazily so that importing this
 * module during `bun run typecheck` or test suites does not blow up if
 * ENCRYPTION_KEY is not set — it only throws when encrypt/decrypt runs.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (raw && raw.length > 0) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== KEY_LEN) {
      throw new Error(
        `ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${buf.length}). ` +
          `Generate with: openssl rand -base64 32`,
      );
    }
    cachedKey = buf;
    return buf;
  }

  if (isProduction) {
    throw new Error(
      "ENCRYPTION_KEY is required in production. Generate with: openssl rand -base64 32",
    );
  }

  // Non-production fallback — derive deterministically from SESSION_SECRET.
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error(
      "Neither ENCRYPTION_KEY nor SESSION_SECRET is set — cannot derive encryption key",
    );
  }
  cachedKey = crypto.createHash("sha256").update(sessionSecret + KDF_LABEL).digest();
  return cachedKey;
}

/**
 * Encrypt a UTF-8 string. Returns `iv:ciphertext:authTag` (all base64).
 * Random IV per call — ciphertexts of the same plaintext differ.
 */
export function encryptSecret(plaintext: string): string {
  if (typeof plaintext !== "string") {
    throw new TypeError("encryptSecret: plaintext must be a string");
  }
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${ct.toString("base64")}:${tag.toString("base64")}`;
}

/**
 * Decrypt a value produced by `encryptSecret`. Throws if the auth tag does
 * not verify (tampering, wrong key, or legacy plaintext row).
 */
export function decryptSecret(ciphertext: string): string {
  if (typeof ciphertext !== "string" || ciphertext.length === 0) {
    throw new Error("decryptSecret: input must be a non-empty string");
  }
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("decryptSecret: malformed ciphertext (expected iv:ct:tag)");
  }
  const ivB64 = parts[0] ?? "";
  const ctB64 = parts[1] ?? "";
  const tagB64 = parts[2] ?? "";
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  if (iv.length !== IV_LEN) {
    throw new Error(`decryptSecret: invalid IV length ${iv.length}`);
  }
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/**
 * Heuristic — returns true if the stored value looks like output of
 * `encryptSecret` (three base64 chunks). Used during the migration window
 * to distinguish legacy plaintext rows from already-encrypted rows.
 */
export function looksEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  try {
    const iv = Buffer.from(parts[0] ?? "", "base64");
    const tag = Buffer.from(parts[2] ?? "", "base64");
    return iv.length === IV_LEN && tag.length === 16;
  } catch {
    return false;
  }
}
