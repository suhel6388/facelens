import type { NextFunction, Request, Response } from "express";
import type { AdminAuditLogsQuery } from "@app/validation";
import { sendPaginated, sendSuccess } from "../../lib/http.js";
import type { AdminService } from "./admin.service.js";

export class AdminController {
  constructor(private readonly service: AdminService) {}

  getOverview = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const overview = await this.service.getOverview();
      sendSuccess(res, 200, overview);
    } catch (err) {
      next(err);
    }
  };

  listUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (res.locals.validated?.query ?? { page: 1, limit: 20 }) as {
        page: number;
        limit: number;
      };
      const result = await this.service.listUsers(query);
      sendPaginated(res, result.items, {
        page: query.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  };

  listWorkspaces = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (res.locals.validated?.query ?? { page: 1, limit: 20 }) as {
        page: number;
        limit: number;
      };
      const result = await this.service.listWorkspaces(query);
      sendPaginated(res, result.items, {
        page: query.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  };

  listAuditLogs = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (res.locals.validated?.query ?? {
        page: 1,
        limit: 20,
      }) as AdminAuditLogsQuery;
      const result = await this.service.listAuditLogs(query);
      sendPaginated(res, result.items, {
        page: query.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  };
}
