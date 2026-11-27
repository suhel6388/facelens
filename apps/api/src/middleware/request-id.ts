import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * Attaches a unique requestId to every incoming request and response header.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  const requestId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
