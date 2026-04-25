/**
 * API key management — generate, validate, revoke.
 *
 * Keys are stored as SHA-256 hashes. The plaintext key is returned once
 * on creation and never stored.
 */

import { nanoid } from "nanoid";
// API key validation runs in resolveAuth — BEFORE the tenant context is set
// (the api_keys row is what tells us which org). All functions here gate on
// org_id via explicit WHERE clauses, so the BYPASSRLS pool is the right tool.
import { adminSql as sql } from "../db/client.js";
import { config } from "../config.js";

export interface ApiKey {
  id: string;
  orgId: string;
  userId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

async function sha256(input: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(input);
  return hasher.digest("hex");
}

export async function createApiKey(
  orgId: string,
  userId: string,
  name: string,
  expiresInDays?: number,
): Promise<{ key: ApiKey; plaintext: string }> {
  const plaintext = `${config.auth.apiKeyPrefix}${nanoid(40)}`;
  const keyHash = await sha256(plaintext);
  // ENG-P2-6: keep the prefix short (4-char "bjk_" + 6 random = 10) so a
  // leaked listing of prefixes doesn't materially help correlate keys
  // across systems. 6 random chars from nanoid alphabet ≈ 2^36 — visually
  // distinct enough for the operator UI without exposing entropy.
  const keyPrefix = plaintext.slice(0, 10);
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const [key] = await sql`
    INSERT INTO api_keys (org_id, user_id, name, key_hash, key_prefix, expires_at)
    VALUES (${orgId}, ${userId}, ${name}, ${keyHash}, ${keyPrefix}, ${expiresAt})
    RETURNING *
  `;

  return { key: key as ApiKey, plaintext };
}

export async function validateApiKey(
  plaintext: string,
): Promise<{ id: string; orgId: string; userId: string } | null> {
  const keyHash = await sha256(plaintext);

  const [key] = await sql`
    UPDATE api_keys
    SET last_used_at = now()
    WHERE key_hash = ${keyHash}
      AND (expires_at IS NULL OR expires_at > now())
    RETURNING id, org_id, user_id
  `;

  if (!key) return null;
  return {
    id: key.id as string,
    orgId: key.orgId as string,
    userId: key.userId as string,
  };
}

export async function revokeApiKey(keyId: string, orgId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM api_keys WHERE id = ${keyId} AND org_id = ${orgId}
  `;
  return result.count > 0;
}

export async function listApiKeys(orgId: string): Promise<ApiKey[]> {
  const keys = await sql`
    SELECT id, org_id, user_id, name, key_prefix, last_used_at, expires_at, created_at
    FROM api_keys WHERE org_id = ${orgId}
    ORDER BY created_at DESC
  `;
  return keys as unknown as ApiKey[];
}
