import type { NextFunction, Request, Response } from "express";
import type { CreateUploadTicketInput } from "@app/validation";
import { sendSuccess } from "../../lib/http.js";
import { getAuthContext } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error-handler.js";
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

  uploadDirect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const expires = Number(req.query.expires);
      const signature = typeof req.query.sig === "string" ? req.query.sig : "";
      if (!Buffer.isBuffer(req.body)) {
        throw new AppError(400, "VALIDATION_ERROR", "Binary image payload is required.");
      }

      const result = await this.service.uploadDirect({
        workspaceId: req.params.workspaceId!,
        imageId: req.params.imageId!,
        expires,
        signature,
        buffer: req.body,
      });
      sendSuccess(res, 200, result);
    } catch (err) {
      next(err);
    }
  };

  getImageContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { buffer, mimeType } = await this.service.getImageContent(
        req.params.workspaceId!,
        req.params.imageId!,
      );
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Security-Policy", "default-src 'none'");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, max-age=300");
      res.status(200).send(buffer);
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
