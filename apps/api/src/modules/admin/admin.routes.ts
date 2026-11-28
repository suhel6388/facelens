import { Router } from "express";
import { z } from "zod";
import { adminAuditLogsQuerySchema, paginationSchema } from "@app/validation";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import type { AdminController } from "./admin.controller.js";

const imageParam = z.object({ imageId: z.string().uuid() });

export function createAdminRouter(controller: AdminController): Router {
  const router = Router();

  router.use(requireAuth, requireRole(["ADMIN"]));

  router.get("/overview", controller.getOverview);
  router.get("/users", validate({ query: paginationSchema }), controller.listUsers);
  router.get("/workspaces", validate({ query: paginationSchema }), controller.listWorkspaces);
  router.get(
    "/audit-logs",
    validate({ query: adminAuditLogsQuerySchema }),
    controller.listAuditLogs,
  );
  router.get("/subscriptions", validate({ query: paginationSchema }), controller.listSubscriptions);
  router.get("/payments", validate({ query: paginationSchema }), controller.listPayments);
  router.get("/analytics", controller.getAnalytics);
  router.get(
    "/deletion-requests",
    validate({ query: paginationSchema }),
    controller.listDeletionRequests,
  );
  router.post(
    "/deletion-requests/:imageId/purge",
    validate({ params: imageParam }),
    controller.purgeDeletionRequest,
  );
  router.get("/system-health", controller.getSystemHealth);

  return router;
}
