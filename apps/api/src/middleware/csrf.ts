import type { NextFunction, Request, Response } from "express";
import { ACCESS_COOKIE_NAME, CSRF_COOKIE_NAME, REFRESH_COOKIE_NAME } from "../lib/cookies.js";
import { AppError } from "./error-handler.js";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Protects cookie-authenticated state-changing endpoints using double-submit CSRF tokens.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  const hasAuthCookie = Boolean(cookies[ACCESS_COOKIE_NAME] || cookies[REFRESH_COOKIE_NAME]);
  const hasBearer = req.header("authorization")?.startsWith("Bearer ");

  if (!hasAuthCookie || hasBearer) {
    next();
    return;
  }

  const cookieToken = cookies[CSRF_COOKIE_NAME];
  const headerToken = req.header("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    next(new AppError(403, "CSRF_INVALID", "Invalid or missing CSRF token."));
    return;
  }

  next();
}
