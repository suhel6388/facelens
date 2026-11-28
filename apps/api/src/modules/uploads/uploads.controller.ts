import type { NextFunction, Request, Response } from "express";
import type { CreateUploadTicketInput } from "@app/validation";
import { sendSuccess } from "../../lib/http.js";
import { getAuthContext } from "../../middleware/auth.js";
import type { UploadsService } from "./uploads.service.js";

export class UploadsController {
  constructor(private readonly service: UploadsService) {}

  createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const ticket = await this.service.createUploadTicket(
        req.params.workspaceId!,
        auth.userId,
        req.body as CreateUploadTicketInput,
      );
      sendSuccess(res, 201, ticket);
    } catch (err) {
      next(err);
    }
  };

  listCollectionImages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const images = await this.service.listCollectionImages(
        req.params.workspaceId!,
        req.params.collectionId!,
      );
      sendSuccess(res, 200, images);
    } catch (err) {
      next(err);
    }
  };

  deleteImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      await this.service.deleteImage(req.params.workspaceId!, req.params.imageId!, auth.userId);
      sendSuccess(res, 200, { deleted: true });
    } catch (err) {
      next(err);
    }
  };
}
