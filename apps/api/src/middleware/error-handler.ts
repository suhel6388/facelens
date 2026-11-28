import type { NextFunction, Request, Response } from "express";
import type { ApiErrorDetail, ApiErrorResponse } from "@app/types";
import { logger } from "../lib/logger.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ApiErrorDetail[];

  constructor(statusCode: number, code: string, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Formats uncaught and operational errors into the standard API error envelope.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "unknown";

  if (err instanceof AppError) {
    const body: ApiErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      meta: { requestId, timestamp: new Date().toISOString() },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  logger.error(
    {
      requestId,
      method: req.method,
      path: req.originalUrl,
      err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    },
    "Unhandled server error",
  );

  const body: ApiErrorResponse = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
    meta: { requestId, timestamp: new Date().toISOString() },
  };
  res.status(500).json(body);
}
