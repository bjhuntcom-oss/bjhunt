/**
 * Request ID middleware — generates X-Request-ID for distributed tracing.
 */

import type { MiddlewareHandler } from "hono";
import { nanoid } from "nanoid";

export const requestId: MiddlewareHandler = async (c, next) => {
  const id = c.req.header("x-request-id") || nanoid(16);
  c.set("requestId", id);
  c.header("X-Request-ID", id);
  await next();
};
