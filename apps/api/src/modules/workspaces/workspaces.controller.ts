import type { NextFunction, Request, Response } from "express";
import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  UpdateWorkspaceMemberInput,
} from "@app/validation";
import { sendSuccess } from "../../lib/http.js";
import { getAuthContext } from "../../middleware/auth.js";
import type { WorkspacesService } from "./workspaces.service.js";

export class WorkspacesController {
  constructor(private readonly service: WorkspacesService) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const workspaces = await this.service.listForUser(auth.userId);
      sendSuccess(res, 200, workspaces);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const created = await this.service.createWorkspace(
        auth.userId,
        req.body as CreateWorkspaceInput,
      );
      sendSuccess(res, 201, created);
    } catch (err) {
      next(err);
    }
  };

  getDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = getAuthContext(res);
      const detail = await this.service.getDetail(req.params.workspaceId!, auth.userId);
      sendSuccess(res, 200, detail);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.service.updateWorkspace(
        req.params.workspaceId!,
        req.body as UpdateWorkspaceInput,
      );
      sendSuccess(res, 200, updated);
    } catch (err) {
      next(err);
    }
  };

  listMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const members = await this.service.listMembers(req.params.workspaceId!);
      sendSuccess(res, 200, members);
    } catch (err) {
      next(err);
    }
  };

  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const member = await this.service.addMember(
        req.params.workspaceId!,
        req.body as AddWorkspaceMemberInput,
      );
      sendSuccess(res, 201, member);
    } catch (err) {
      next(err);
    }
  };

  updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const member = await this.service.updateMemberRole(
        req.params.workspaceId!,
        req.params.memberId!,
        req.body as UpdateWorkspaceMemberInput,
      );
      sendSuccess(res, 200, member);
    } catch (err) {
      next(err);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.removeMember(req.params.workspaceId!, req.params.memberId!);
      sendSuccess(res, 200, { removed: true });
    } catch (err) {
      next(err);
    }
  };
}
