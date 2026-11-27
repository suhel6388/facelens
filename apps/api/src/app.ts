import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { ApiSuccessResponse, HealthStatusDto } from "@app/types";
import { env } from "./config/env.js";
import {
  getAuthContext,
  requireAuth,
  requireRole,
  requireWorkspaceRole,
} from "./middleware/auth.js";
import { csrfProtection } from "./middleware/csrf.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { PrismaAuthRepository, type AuthRepository } from "./modules/auth/auth.repository.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { AuthService, type AuthTokenDispatcher } from "./modules/auth/auth.service.js";

export interface CreateAppOptions {
  authRepository?: AuthRepository;
  dispatchToken?: AuthTokenDispatcher;
}

/**
 * Builds and configures the Express application without binding a network port.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const helmetMiddleware = helmet() as unknown as express.RequestHandler;

  app.use(helmetMiddleware);
  app.use(
    cors({
      origin: env.webOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(csrfProtection);

  const healthHandler = (_req: express.Request, res: express.Response): void => {
    const payload: ApiSuccessResponse<HealthStatusDto> = {
      data: {
        status: "ok",
        service: "api",
        version: "0.1.0",
      },
      meta: {
        requestId: typeof res.locals.requestId === "string" ? res.locals.requestId : "unknown",
        timestamp: new Date().toISOString(),
      },
    };
    res.status(200).json(payload);
  };

  app.get("/health", healthHandler);
  app.get("/api/v1/health", healthHandler);

  const authRepo = options.authRepository ?? new PrismaAuthRepository();
  const authService = new AuthService(authRepo, options.dispatchToken);
  const authController = new AuthController(authService);
  app.use("/api/v1/auth", createAuthRouter(authController));

  app.get(
    "/api/v1/workspaces/:workspaceId/access-check",
    requireAuth,
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], (wsId, userId) =>
      authRepo.getWorkspaceRole(wsId, userId),
    ),
    (_req, res) => {
      const auth = getAuthContext(res);
      res.status(200).json({
        data: {
          workspaceId: res.locals.workspaceId,
          workspaceRole: res.locals.workspaceRole,
          userId: auth.userId,
        },
        meta: { requestId: res.locals.requestId },
      });
    },
  );

  app.get("/api/v1/admin/overview", requireAuth, requireRole(["ADMIN"]), (_req, res) => {
    res.status(200).json({
      data: { status: "ok", scope: "admin" },
      meta: { requestId: res.locals.requestId },
    });
  });

  app.use(errorHandler);

  return app;
}
