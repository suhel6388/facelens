import type { NextFunction, Request, Response } from "express";
import type { CreateSearchInput } from "@app/validation";
import { sendPaginated, sendSuccess } from "../../lib/http.js";
import { getAuthContext } from "../../middleware/auth.js";
import type { SearchesService } from "./searches.service.js";

export class SearchesController {
  constructor(private readonly service: SearchesService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (res.locals.validated?.query ?? { page: 1, limit: 20 }) as {
        page: number;
        limit: number;
      };
      const result = await this.service.list(req.params.workspaceId!, query);
      sendPaginated(res, result.items, {
        page: query.page,
        limit: query.limit,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const created = await this.service.create(
        req.params.workspaceId!,
        auth.userId,
        req.body as CreateSearchInput,
      );
      sendSuccess(res, 201, created);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.service.getById(req.params.workspaceId!, req.params.searchId!);
      sendSuccess(res, 200, detail);
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.service.cancel(req.params.workspaceId!, req.params.searchId!);
      sendSuccess(res, 200, updated);
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      await this.service.remove(req.params.workspaceId!, req.params.searchId!, auth.userId);
      sendSuccess(res, 200, { deleted: true });
    } catch (err) {
      next(err);
    }
  };
}
