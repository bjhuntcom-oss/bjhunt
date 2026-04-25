import type { AppVariables } from "../types.js";
/**
 * Notification routes — list, mark read, unread count.
 */

import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { withOrg } from "../db/client.js";
import { config } from "../config.js";
import type { AuthUser } from "../middleware/auth.js";

export const notificationRoutes = new Hono<{ Variables: AppVariables }>();

notificationRoutes.use("*", requireAuth);
notificationRoutes.use("*", rateLimit(config.rateLimit.api));

// List notifications for current user
notificationRoutes.get("/", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const unreadOnly = c.req.query("unread") === "true";

  const notifications = await withOrg(orgId, (tx) => {
    if (unreadOnly) {
      return tx`
        SELECT * FROM notifications
        WHERE user_id = ${user.id} AND read_at IS NULL
        ORDER BY created_at DESC LIMIT ${limit}
      `;
    }
    return tx`
      SELECT * FROM notifications
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
  });

  return c.json({ notifications });
});

// Unread count
notificationRoutes.get("/count", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;

  const [countRow] = await withOrg(orgId, (tx) =>
    tx`SELECT count(*)::int as total FROM notifications WHERE user_id = ${user.id} AND read_at IS NULL`,
  );

  return c.json({ unread: (countRow as any)?.total ?? 0 });
});

// Mark notification(s) as read
notificationRoutes.post("/read", async (c) => {
  const orgId = c.get("orgId") as string;
  const user = c.get("user") as AuthUser;
  const body = await c.req.json<{ ids?: string[]; all?: boolean }>();

  if (body.all) {
    await withOrg(orgId, (tx) =>
      tx`UPDATE notifications SET read_at = now() WHERE user_id = ${user.id} AND read_at IS NULL`,
    );
  } else if (body.ids && body.ids.length > 0) {
    const ids = body.ids;
    await withOrg(orgId, (tx) =>
      tx`UPDATE notifications SET read_at = now() WHERE user_id = ${user.id} AND id = ANY(${ids})`,
    );
  }

  return c.json({ ok: true });
});
