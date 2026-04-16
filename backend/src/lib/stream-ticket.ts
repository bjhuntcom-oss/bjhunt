/**
 * Stream ticket — HMAC-SHA256 signed ticket for SSE stream authentication.
 *
 * Flow: POST /prepare returns a signed ticket → GET /stream/:runId verifies it.
 * This avoids passing session cookies cross-origin for direct SSE connections
 * and eliminates the Vercel 10s serverless timeout by splitting prepare + stream.
 *
 * Format: base64url(payload).base64url(signature)
 * TTL: 2 minutes (payload.exp is checked on verify).
 */

import { config } from "../config.js";

/** Payload embedded in a stream ticket. */
export interface TicketPayload {
  /** Session user ID */
  sid: string;
  /** Organization ID */
  org: string;
  /** Conversation ID */
  conv: string;
  /** Agent run ID */
  run: string;
  /** Expiry (epoch seconds) */
  exp: number;
}

/** Default TTL: 2 minutes in seconds. */
const TICKET_TTL_S = 120;

// ── Helpers ─────────────────────────────────────────────────────────────

function base64urlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

let _signingKey: CryptoKey | null = null;

async function getSigningKey(): Promise<CryptoKey> {
  if (_signingKey) return _signingKey;
  const encoder = new TextEncoder();
  _signingKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(config.auth.sessionSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return _signingKey;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Sign a ticket payload. Returns `base64url(payload).base64url(signature)`.
 *
 * If `payload.exp` is not set, it defaults to now + 2 minutes.
 */
export async function signTicket(payload: Omit<TicketPayload, "exp"> & { exp?: number }): Promise<string> {
  const full: TicketPayload = {
    ...payload,
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + TICKET_TTL_S,
  };

  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(JSON.stringify(full));
  const payloadB64 = base64urlEncode(payloadBytes.buffer as ArrayBuffer);

  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, payloadBytes);
  const sigB64 = base64urlEncode(signature);

  return `${payloadB64}.${sigB64}`;
}

/**
 * Verify a ticket string. Returns the decoded payload if valid, or `null` if
 * the signature is invalid or the ticket has expired.
 */
export async function verifyTicket(ticket: string): Promise<TicketPayload | null> {
  const dotIndex = ticket.indexOf(".");
  if (dotIndex === -1) return null;

  const payloadB64 = ticket.slice(0, dotIndex);
  const sigB64 = ticket.slice(dotIndex + 1);

  if (!payloadB64 || !sigB64) return null;

  let payloadBytes: Uint8Array;
  let sigBytes: Uint8Array;
  try {
    payloadBytes = base64urlDecode(payloadB64);
    sigBytes = base64urlDecode(sigB64);
  } catch {
    return null;
  }

  // Verify HMAC signature
  const key = await getSigningKey();
  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(sigBytes) as unknown as ArrayBuffer,
      new Uint8Array(payloadBytes) as unknown as ArrayBuffer,
    );
  } catch {
    return null;
  }

  if (!valid) return null;

  // Decode and parse payload
  let payload: TicketPayload;
  try {
    const decoder = new TextDecoder();
    payload = JSON.parse(decoder.decode(payloadBytes)) as TicketPayload;
  } catch {
    return null;
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) return null;

  // Validate required fields
  if (!payload.sid || !payload.org || !payload.conv || !payload.run) return null;

  return payload;
}
