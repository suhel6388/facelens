import express, { Router } from "express";
import { z } from "zod";
import { createUploadTicketSchema } from "@app/validation";
import {
  requireAuth,
  requireWorkspaceRole,
  type WorkspaceMembershipResolver,
} from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import type { UploadsController } from "./uploads.controller.js";

const workspaceParams = z.object({ workspaceId: z.string().uuid() });
const collectionParams = z.object({
  workspaceId: z.string().uuid(),
  collectionId: z.string().uuid(),
});
const imageParams = z.object({
  workspaceId: z.string().uuid(),
  imageId: z.string().uuid(),
});

export function createUploadsRouter(
  controller: UploadsController,
  resolveMembership: WorkspaceMembershipResolver,
): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  router.post(
    "/ticket",
    validate({ params: workspaceParams, body: createUploadTicketSchema }),
    requireWorkspaceRole(["OWNER", "MEMBER"], resolveMembership),
    controller.createTicket,
  );
  router.put(
    "/direct/:imageId",
    validate({ params: imageParams }),
    requireWorkspaceRole(["OWNER", "MEMBER"], resolveMembership),
    express.raw({
      type: ["image/jpeg", "image/png", "image/webp", "application/octet-stream"],
      limit: "11mb",
    }),
    controller.uploadDirect,
  );
  router.get(
    "/images/:imageId/content",
    validate({ params: imageParams }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.getImageContent,
  );
  router.get(
    "/collections/:collectionId/images",
    validate({ params: collectionParams }),
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveMembership),
    controller.listCollectionImages,
  );
  router.delete(
    "/images/:imageId",
    validate({ params: imageParams }),
    requireWorkspaceRole(["OWNER", "MEMBER"], resolveMembership),
    controller.deleteImage,
  );

  return router;
}
