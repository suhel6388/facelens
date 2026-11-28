import { Router } from "express";
import { updateProfileSchema } from "@app/validation";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import type { UsersController } from "./users.controller.js";

export function createUsersRouter(controller: UsersController): Router {
  const router = Router();

  router.use(requireAuth);
  router.get("/me", controller.getMe);
  router.patch("/me", validate({ body: updateProfileSchema }), controller.updateMe);
  router.delete("/me", controller.deleteMe);

  return router;
}
