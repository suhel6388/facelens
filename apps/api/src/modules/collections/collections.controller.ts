import type { NextFunction, Request, Response } from "express";
import type { CreateCollectionInput, UpdateCollectionInput } from "@app/validation";
import { sendSuccess } from "../../lib/http.js";
import { getAuthContext } from "../../middleware/auth.js";
import type { CollectionsService } from "./collections.service.js";

export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.service.list(req.params.workspaceId!);
      sendSuccess(res, 200, items);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = await this.service.getById(req.params.workspaceId!, req.params.collectionId!);
      sendSuccess(res, 200, item);
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
        req.body as CreateCollectionInput,
      );
      sendSuccess(res, 201, created);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.service.update(
        req.params.workspaceId!,
        req.params.collectionId!,
        req.body as UpdateCollectionInput,
      );
      sendSuccess(res, 200, updated);
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      await this.service.remove(req.params.workspaceId!, req.params.collectionId!, auth.userId);
      sendSuccess(res, 200, { deleted: true });
    } catch (err) {
      next(err);
    }
  };
}
