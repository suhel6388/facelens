import type { NextFunction, Request, Response } from "express";
import type { WithdrawConsentInput } from "@app/validation";
import { sendSuccess } from "../../lib/http.js";
import { getAuthContext } from "../../middleware/auth.js";
import type { ConsentService } from "./consent.service.js";

export class ConsentController {
  constructor(private readonly service: ConsentService) {}

  listByWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const records = await this.service.listByWorkspace(req.params.workspaceId!);
      sendSuccess(res, 200, records);
    } catch (err) {
      next(err);
    }
  };

  listByImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const records = await this.service.listByImage(req.params.workspaceId!, req.params.imageId!);
      sendSuccess(res, 200, records);
    } catch (err) {
      next(err);
    }
  };

  withdraw = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const record = await this.service.withdraw(
        req.params.workspaceId!,
        req.params.imageId!,
        auth.userId,
        req.body as WithdrawConsentInput,
      );
      sendSuccess(res, 200, record);
    } catch (err) {
      next(err);
    }
  };
}
