import { Router } from "express";
import { z } from "zod";
import { createCollectionSchema, updateCollectionSchema } from "@app/validation";
import {
  requireAuth,
  requireWorkspaceRole,
  type WorkspaceMembershipResolver,
} from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import type { CollectionsController } from "./collections.controller.js";

const workspaceParams = z.object({ workspaceId: z.string().uuid() });
const collectionParams = z.object({
  workspaceId: z.string().uuid(),
  collectionId: z.string().uuid(),
});

export function createCollectionsRouter(
  controller: CollectionsController,
  resolveMembership: WorkspaceMembershipResolver,
): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  router.get(
    "/",
    validate({ params: workspaceParams }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.list,
  );
  router.post(
    "/",
    validate({ params: workspaceParams, body: createCollectionSchema }),
    requireWorkspaceRole(["OWNER", "MEMBER"], resolveMembership),
    controller.create,
  );
  router.get(
    "/:collectionId",
    validate({ params: collectionParams }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.getById,
  );
  router.patch(
    "/:collectionId",
    validate({ params: collectionParams, body: updateCollectionSchema }),
    requireWorkspaceRole(["OWNER", "MEMBER"], resolveMembership),
    controller.update,
  );
  router.delete(
    "/:collectionId",
    validate({ params: collectionParams }),
    requireWorkspaceRole(["OWNER", "MEMBER"], resolveMembership),
    controller.remove,
  );

  return router;
}
