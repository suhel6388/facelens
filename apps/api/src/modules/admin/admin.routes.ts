import { Router } from "express";
import { adminAuditLogsQuerySchema, paginationSchema } from "@app/validation";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import type { AdminController } from "./admin.controller.js";

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

  return router;
}
