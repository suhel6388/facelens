import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";
import { generateOpaqueToken } from "./auth-crypto.js";

export const ACCESS_COOKIE_NAME = "facelens_access";
export const REFRESH_COOKIE_NAME = "facelens_refresh";
export const CSRF_COOKIE_NAME = "facelens_csrf";

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): string {
  const csrfToken = generateOpaqueToken(16);

  res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
    ...baseCookieOptions(),
    maxAge: env.accessTokenTtlSeconds * 1000,
  });

  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    ...baseCookieOptions(),
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });

  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });

  return csrfToken;
}

export function clearAuthCookies(res: Response): void {
  const opts = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE_NAME, opts);
  res.clearCookie(REFRESH_COOKIE_NAME, opts);
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
  });
}
