import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponse } from "@app/types";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Formats uncaught and operational errors into the standard API error envelope.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "unknown";

  if (err instanceof AppError) {
    const body: ApiErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
      },
      meta: { requestId },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  const body: ApiErrorResponse = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
    meta: { requestId },
  };
  res.status(500).json(body);
}
