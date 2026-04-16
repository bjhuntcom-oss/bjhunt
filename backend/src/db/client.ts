/**
 * PostgreSQL client — connection pool with RLS tenant isolation.
 */

import postgres from "postgres";
import { config } from "../config.js";

export const sql = postgres(config.database.url, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,    // recycle connections every 30 min
  transform: postgres.camel,
});

/**
 * Execute a query within a tenant-scoped transaction.
 * Sets `app.current_org_id` so RLS policies filter rows automatically.
 */
export async function withOrg<T>(
  orgId: string,
  fn: (sql: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_org_id', ${orgId}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

/**
 * Graceful shutdown — drain the connection pool so in-flight queries
 * finish before the process exits. Called on SIGTERM / SIGINT.
 */
async function drainPool() {
  console.log("[DB] Draining PostgreSQL connection pool...");
  await sql.end({ timeout: 5 });
  console.log("[DB] Pool drained.");
}

process.on("SIGTERM", drainPool);
process.on("SIGINT", drainPool);
