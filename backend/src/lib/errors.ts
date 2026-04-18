/**
 * Standardised error types for the backend API.
 *
 * Per docs/architecture/05-BACKEND-API.md §Error Handling, every error
 * thrown by route handlers should extend `AppError` so the global handler
 * in src/index.ts can serialise it consistently:
 *
 *   {
 *     "error": {
 *       "code": "VALIDATION_ERROR",
 *       "message": "Invalid input",
 *       "details": { ... }
 *     }
 *   }
 *
 * Plain `Error` thrown by handler code falls through to a generic 500.
 */

import type { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, "NOT_FOUND", `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(403, "FORBIDDEN", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}

export class QuotaExceededError extends AppError {
  constructor(resource: string, limit: number) {
    super(429, "QUOTA_EXCEEDED", `${resource} quota exceeded (limit: ${limit})`, {
      resource,
      limit,
    });
  }
}

export class RateLimitedError extends AppError {
  constructor(retryAfterSec: number) {
    super(429, "RATE_LIMITED", "Too many requests", { retryAfterSec });
  }
}

export class ValidationError extends AppError {
  constructor(errors: ZodError | string) {
    if (typeof errors === "string") {
      super(400, "VALIDATION_ERROR", errors);
    } else {
      super(400, "VALIDATION_ERROR", "Invalid input", errors.flatten());
    }
  }
}

export class UpstreamError extends AppError {
  constructor(service: string, message: string, statusCode = 502) {
    super(statusCode, "UPSTREAM_ERROR", `${service}: ${message}`, { service });
  }
}

export class NotImplementedError extends AppError {
  constructor(feature: string) {
    super(501, "NOT_IMPLEMENTED", `${feature} is not yet implemented`);
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
