/**
 * Session management — stateful sessions stored in PostgreSQL.
 */

import { nanoid } from "nanoid";
import { sql } from "../db/client.js";
import { config } from "../config.js";

export interface Session {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export async function createSession(
  userId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<Session> {
  const id = nanoid(32);
  const expiresAt = new Date(Date.now() + config.auth.sessionMaxAge * 1000);

  const [session] = await sql`
    INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at)
    VALUES (${id}, ${userId}, ${ip}, ${userAgent}, ${expiresAt})
    RETURNING *
  `;

  return session as Session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const [session] = await sql`
    SELECT * FROM sessions
    WHERE id = ${sessionId} AND expires_at > now()
  `;

  return (session as Session) ?? null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
}

export async function cleanExpiredSessions(): Promise<number> {
  const result = await sql`
    DELETE FROM sessions WHERE expires_at <= now()
  `;
  return result.count;
}
