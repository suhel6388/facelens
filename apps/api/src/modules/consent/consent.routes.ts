import { Router } from "express";
import { z } from "zod";
import { withdrawConsentSchema } from "@app/validation";
import {
  requireAuth,
  requireWorkspaceRole,
  type WorkspaceMembershipResolver,
} from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import type { ConsentController } from "./consent.controller.js";

const workspaceParams = z.object({ workspaceId: z.string().uuid() });
const collectionParams = z.object({
  workspaceId: z.string().uuid(),
  collectionId: z.string().uuid(),
});
const imageParams = z.object({ workspaceId: z.string().uuid(), imageId: z.string().uuid() });

export function createConsentRouter(
  controller: ConsentController,
  resolveMembership: WorkspaceMembershipResolver,
): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  router.get(
    "/",
    validate({ params: workspaceParams }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.listByWorkspace,
  );
  router.get(
    "/collections/:collectionId",
    validate({ params: collectionParams }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.listByCollection,
  );
  router.get(
    "/images/:imageId",
    validate({ params: imageParams }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.listByImage,
  );
  router.post(
    "/images/:imageId/withdraw",
    validate({ params: imageParams, body: withdrawConsentSchema }),
    requireWorkspaceRole(["OWNER", "MEMBER"], resolveMembership),
    controller.withdraw,
  );

  return router;
}
