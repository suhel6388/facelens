import type { NextFunction, Request, Response } from "express";
import type { ApiSuccessResponse } from "@app/types";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@app/validation";
import { clearAuthCookies, REFRESH_COOKIE_NAME, setAuthCookies } from "../../lib/cookies.js";
import { getAuthContext } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error-handler.js";
import type { AuthService } from "./auth.service.js";

function getRequestId(res: Response): string {
  return typeof res.locals.requestId === "string" ? res.locals.requestId : "unknown";
}

function sendSuccess<T>(res: Response, statusCode: number, data: T): void {
  const payload: ApiSuccessResponse<T> = {
    data,
    meta: { requestId: getRequestId(res) },
  };
  res.status(statusCode).json(payload);
}

function parseOrThrow<T>(
  schema: {
    safeParse: (d: unknown) => {
      success: boolean;
      data?: T;
      error?: { issues: { message: string }[] };
    };
  },
  body: unknown,
): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success || !parsed.data) {
    const message = parsed.error?.issues[0]?.message ?? "Validation failed.";
    throw new AppError(400, "VALIDATION_ERROR", message);
  }
  return parsed.data;
}

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = parseOrThrow(registerSchema, req.body);
      const result = await this.service.register(input, {
        userAgent: req.header("user-agent") ?? null,
        ipAddress: req.ip ?? null,
      });
      setAuthCookies(res, result.tokens);
      sendSuccess(res, 201, result.me);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = parseOrThrow(loginSchema, req.body);
      const result = await this.service.login(input, {
        userAgent: req.header("user-agent") ?? null,
        ipAddress: req.ip ?? null,
      });
      setAuthCookies(res, result.tokens);
      sendSuccess(res, 200, result.me);
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
      const refreshToken = cookies[REFRESH_COOKIE_NAME];
      if (!refreshToken) {
        throw new AppError(401, "MISSING_REFRESH_TOKEN", "Refresh token cookie is required.");
      }
      const result = await this.service.refresh(refreshToken);
      setAuthCookies(res, result.tokens);
      sendSuccess(res, 200, result.me);
    } catch (err) {
      next(err);
    }
  };

  logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      await this.service.logout(auth.sessionId, auth.userId);
      clearAuthCookies(res);
      sendSuccess(res, 200, { loggedOut: true });
    } catch (err) {
      next(err);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = parseOrThrow(verifyEmailSchema, req.body);
      await this.service.verifyEmail(input);
      sendSuccess(res, 200, { verified: true });
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = parseOrThrow(forgotPasswordSchema, req.body);
      await this.service.forgotPassword(input);
      sendSuccess(res, 200, {
        message: "If an account with that email exists, a reset link has been sent.",
      });
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = parseOrThrow(resetPasswordSchema, req.body);
      await this.service.resetPassword(input);
      clearAuthCookies(res);
      sendSuccess(res, 200, { reset: true });
    } catch (err) {
      next(err);
    }
  };

  me = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const me = await this.service.getMe(auth.userId);
      sendSuccess(res, 200, me);
    } catch (err) {
      next(err);
    }
  };

  listSessions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const sessions = await this.service.listSessions(auth.userId, auth.sessionId);
      sendSuccess(res, 200, sessions);
    } catch (err) {
      next(err);
    }
  };

  revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const sessionId = req.params.sessionId;
      if (!sessionId) {
        throw new AppError(400, "VALIDATION_ERROR", "Session ID is required.");
      }
      await this.service.revokeSession(sessionId, auth.userId);
      sendSuccess(res, 200, { revoked: true });
    } catch (err) {
      next(err);
    }
  };
}
