import { Router } from "express";
import { z } from "zod";
import { createSearchSchema, paginationSchema } from "@app/validation";
import {
  requireAuth,
  requireWorkspaceRole,
  type WorkspaceMembershipResolver,
} from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import type { SearchesController } from "./searches.controller.js";

const workspaceParams = z.object({ workspaceId: z.string().uuid() });
const searchParams = z.object({
  workspaceId: z.string().uuid(),
  searchId: z.string().uuid(),
});

export function createSearchesRouter(
  controller: SearchesController,
  resolveMembership: WorkspaceMembershipResolver,
): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  router.get(
    "/",
    validate({ params: workspaceParams, query: paginationSchema }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.list,
  );
  router.post(
    "/",
    validate({ params: workspaceParams, body: createSearchSchema }),
    requireWorkspaceRole(["OWNER", "MEMBER"], resolveMembership),
    controller.create,
  );
  router.get(
    "/:searchId",
    validate({ params: searchParams }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.getById,
  );
  router.post(
    "/:searchId/cancel",
    validate({ params: searchParams }),
    requireWorkspaceRole(["OWNER", "MEMBER"], resolveMembership),
    controller.cancel,
  );
  router.delete(
    "/:searchId",
    validate({ params: searchParams }),
    requireWorkspaceRole(["OWNER", "MEMBER"], resolveMembership),
    controller.remove,
  );

  return router;
}
