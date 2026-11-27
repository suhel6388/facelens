import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { authRateLimiter } from "../../middleware/rate-limit.js";
import type { AuthController } from "./auth.controller.js";

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post("/register", authRateLimiter, controller.register);
  router.post("/login", authRateLimiter, controller.login);
  router.post("/refresh", authRateLimiter, controller.refresh);
  router.post("/verify-email", authRateLimiter, controller.verifyEmail);
  router.post("/forgot-password", authRateLimiter, controller.forgotPassword);
  router.post("/reset-password", authRateLimiter, controller.resetPassword);

  router.post("/logout", requireAuth, controller.logout);
  router.get("/me", requireAuth, controller.me);
  router.get("/sessions", requireAuth, controller.listSessions);
  router.delete("/sessions/:sessionId", requireAuth, controller.revokeSession);

  return router;
}
