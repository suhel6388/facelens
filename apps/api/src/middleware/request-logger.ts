import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";
import { getRequestId } from "../lib/http.js";

/**
 * Logs incoming HTTP requests and response latency using Pino.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const requestId = getRequestId(res);
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    logger[level](
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      },
      "HTTP request completed",
    );
  });

  next();
}
