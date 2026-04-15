/**
 * Hono context variable types — extends c.get()/c.set() with our custom vars.
 */

import type { AuthUser } from "./middleware/auth.js";

export type AppVariables = {
  userId: string;
  orgId: string;
  user: AuthUser;
  requestId: string;
};
