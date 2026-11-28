import type { NextFunction, Request, Response } from "express";
import type { UpdateProfileInput } from "@app/validation";
import { clearAuthCookies } from "../../lib/cookies.js";
import { sendSuccess } from "../../lib/http.js";
import { getAuthContext } from "../../middleware/auth.js";
import type { UsersService } from "./users.service.js";

export class UsersController {
  constructor(private readonly service: UsersService) {}

  getMe = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const user = await this.service.getProfile(auth.userId);
      sendSuccess(res, 200, user);
    } catch (err) {
      next(err);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const user = await this.service.updateProfile(auth.userId, req.body as UpdateProfileInput);
      sendSuccess(res, 200, user);
    } catch (err) {
      next(err);
    }
  };

  deleteMe = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      await this.service.deleteAccount(auth.userId);
      clearAuthCookies(res);
      sendSuccess(res, 200, { deleted: true });
    } catch (err) {
      next(err);
    }
  };
}
