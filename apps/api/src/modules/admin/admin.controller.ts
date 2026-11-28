import type { NextFunction, Request, Response } from "express";
import type { AdminAuditLogsQuery } from "@app/validation";
import { sendPaginated, sendSuccess } from "../../lib/http.js";
import { getAuthContext } from "../../middleware/auth.js";
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

  listSubscriptions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (res.locals.validated?.query ?? { page: 1, limit: 20 }) as {
        page: number;
        limit: number;
      };
      const result = await this.service.listSubscriptions(query);
      sendPaginated(res, result.items, {
        page: query.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  };

  listPayments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (res.locals.validated?.query ?? { page: 1, limit: 20 }) as {
        page: number;
        limit: number;
      };
      const result = await this.service.listPayments(query);
      sendPaginated(res, result.items, {
        page: query.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  };

  getAnalytics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const analytics = await this.service.getAnalytics();
      sendSuccess(res, 200, analytics);
    } catch (err) {
      next(err);
    }
  };

  listDeletionRequests = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = (res.locals.validated?.query ?? { page: 1, limit: 20 }) as {
        page: number;
        limit: number;
      };
      const result = await this.service.listDeletionRequests(query);
      sendPaginated(res, result.items, {
        page: query.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  };

  purgeDeletionRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      await this.service.purgeDeletionRequest(req.params.imageId!, auth.userId);
      sendSuccess(res, 200, { purged: true });
    } catch (err) {
      next(err);
    }
  };

  getSystemHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await this.service.getSystemHealth();
      sendSuccess(res, 200, health);
    } catch (err) {
      next(err);
    }
  };
}
