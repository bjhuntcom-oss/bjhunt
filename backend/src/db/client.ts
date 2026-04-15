/**
 * PostgreSQL client — connection pool with RLS tenant isolation.
 */

import postgres from "postgres";
import { config } from "../config.js";

export const sql = postgres(config.database.url, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
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
  });
}

/**
 * Execute a query without RLS (for platform admin operations).
 * Uses the connection directly — no org scope set.
 */
export async function withoutRLS<T>(
  fn: (sql: typeof import("postgres").default.prototype) => Promise<T>,
): Promise<T> {
  return fn(sql as any);
}
