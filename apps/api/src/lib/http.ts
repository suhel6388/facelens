import type { Response } from "express";
import type { ApiMeta, ApiSuccessResponse, PaginationMeta } from "@app/types";

export function getRequestId(res: Response): string {
  return typeof res.locals.requestId === "string" ? res.locals.requestId : "unknown";
}

export function sendSuccess<T>(res: Response, statusCode: number, data: T): void {
  const payload: ApiSuccessResponse<T, ApiMeta> = {
    data,
    meta: {
      requestId: getRequestId(res),
      timestamp: new Date().toISOString(),
    },
  };
  res.status(statusCode).json(payload);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number },
): void {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const payload: ApiSuccessResponse<T[], PaginationMeta> = {
    data,
    meta: {
      requestId: getRequestId(res),
      timestamp: new Date().toISOString(),
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
    },
  };
  res.status(200).json(payload);
}
