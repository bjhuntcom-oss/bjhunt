/**
 * PostgreSQL clients — dual pool pattern for RLS isolation.
 *
 * Per docs/architecture/10-MULTI-TENANCY.md §131-148:
 *   - `sql`       (alias for `appSql`): tenant pool — connects as `bjhunt_app`
 *                 once migration `0001_force_rls_and_with_check.sql` is applied.
 *                 RLS policies enforce `app.current_org_id` isolation.
 *                 Use via `withOrg(orgId, tx => …)`.
 *   - `adminSql`: super-admin pool — connects as the schema owner (BYPASSRLS).
 *                 Used by /api/admin/logs and /api/admin/monitoring (cross-org
 *                 visibility) and by background workers that need to write to
 *                 multiple tenants in one transaction.
 *
 * Until the migration is applied in prod, both pools point at the same
 * superuser DSN. When `BJHUNT_APP_DATABASE_URL` is set in `.env`, the app
 * pool switches to it and RLS becomes enforced. Set both to the same DSN
 * during the canary period.
 */

import postgres from "postgres";
import { config } from "../config.js";

const appDsn = process.env.BJHUNT_APP_DATABASE_URL || config.database.url;
const adminDsn = config.database.url;

export const appSql = postgres(appDsn, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  transform: postgres.camel,
});

export const adminSql = postgres(adminDsn, {
  max: 5,
  idle_timeout: 30,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  transform: postgres.camel,
});

/** Backwards-compatible alias — existing call sites that use `sql` directly
 *  continue to use the app (RLS-enforced when migration applied) pool. */
export const sql = appSql;

/**
 * Execute a query within a tenant-scoped transaction.
 * Sets `app.current_org_id` so RLS policies filter rows automatically.
 *
 * Always use this from request handlers. Direct `sql` queries OUTSIDE a
 * `withOrg` block return zero rows once RLS migration is applied.
 */
export async function withOrg<T>(
  orgId: string,
  fn: (sql: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return appSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_org_id', ${orgId}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

/**
 * Cross-org read/write — ONLY for super-admin endpoints and background jobs.
 * Uses the `adminSql` pool which (post-migration) BYPASSRLS.
 * Wrap super-admin queries in this so the intent is explicit at the call site.
 */
export async function withSuperAdmin<T>(
  fn: (sql: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return adminSql.begin(async (tx) => fn(tx)) as Promise<T>;
}

/**
 * Graceful shutdown — drain both connection pools so in-flight queries
 * finish before the process exits. Called on SIGTERM / SIGINT.
 */
async function drainPool() {
  console.log("[DB] Draining PostgreSQL connection pools...");
  await Promise.allSettled([appSql.end({ timeout: 5 }), adminSql.end({ timeout: 5 })]);
  console.log("[DB] Pools drained.");
}

process.on("SIGTERM", drainPool);
process.on("SIGINT", drainPool);
