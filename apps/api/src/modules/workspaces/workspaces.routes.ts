import { Router } from "express";
import { z } from "zod";
import {
  addWorkspaceMemberSchema,
  createWorkspaceSchema,
  updateWorkspaceMemberSchema,
  updateWorkspaceSchema,
} from "@app/validation";
import {
  requireAuth,
  requireWorkspaceRole,
  type WorkspaceMembershipResolver,
} from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import type { WorkspacesController } from "./workspaces.controller.js";

const workspaceIdParam = z.object({ workspaceId: z.string().uuid() });
const memberParams = z.object({ workspaceId: z.string().uuid(), memberId: z.string().uuid() });

export function createWorkspacesRouter(
  controller: WorkspacesController,
  resolveMembership: WorkspaceMembershipResolver,
): Router {
  const router = Router();

  router.use(requireAuth);
  router.get("/", controller.list);
  router.post("/", validate({ body: createWorkspaceSchema }), controller.create);

  router.get(
    "/:workspaceId",
    validate({ params: workspaceIdParam }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.getDetail,
  );
  router.patch(
    "/:workspaceId",
    validate({ params: workspaceIdParam, body: updateWorkspaceSchema }),
    requireWorkspaceRole(["OWNER"], resolveMembership),
    controller.update,
  );

  router.get(
    "/:workspaceId/members",
    validate({ params: workspaceIdParam }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.listMembers,
  );
  router.post(
    "/:workspaceId/members",
    validate({ params: workspaceIdParam, body: addWorkspaceMemberSchema }),
    requireWorkspaceRole(["OWNER"], resolveMembership),
    controller.addMember,
  );
  router.patch(
    "/:workspaceId/members/:memberId",
    validate({ params: memberParams, body: updateWorkspaceMemberSchema }),
    requireWorkspaceRole(["OWNER"], resolveMembership),
    controller.updateMember,
  );
  router.delete(
    "/:workspaceId/members/:memberId",
    validate({ params: memberParams }),
    requireWorkspaceRole(["OWNER"], resolveMembership),
    controller.removeMember,
  );

  return router;
}
