import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import type { ApiErrorDetail } from "@app/types";
import { AppError } from "./error-handler.js";

export interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

function mapZodIssues(issues: { path: (string | number)[]; message: string }[]): ApiErrorDetail[] {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : undefined,
    message: issue.message,
  }));
}

/**
 * Validates request body, route params, and query parameters using Zod schemas.
 * Parsed values replace the corresponding properties on req or are stored in res.locals.validated.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validated: Record<string, unknown> = {};

    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        next(
          new AppError(
            400,
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid route parameters.",
            mapZodIssues(parsed.error.issues),
          ),
        );
        return;
      }
      req.params = parsed.data as Record<string, string>;
      validated.params = parsed.data;
    }

    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        next(
          new AppError(
            400,
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Invalid query parameters.",
            mapZodIssues(parsed.error.issues),
          ),
        );
        return;
      }
      validated.query = parsed.data;
    }

    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        next(
          new AppError(
            400,
            "VALIDATION_ERROR",
            parsed.error.issues[0]?.message ?? "Request validation failed.",
            mapZodIssues(parsed.error.issues),
          ),
        );
        return;
      }
      req.body = parsed.data;
      validated.body = parsed.data;
    }

    res.locals.validated = validated;
    next();
  };
}
