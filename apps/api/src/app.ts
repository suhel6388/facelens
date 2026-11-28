import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import type { ApiSuccessResponse, HealthStatusDto } from "@app/types";
import { env } from "./config/env.js";
import { getAuthContext, requireAuth, requireWorkspaceRole } from "./middleware/auth.js";
import { csrfProtection } from "./middleware/csrf.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.js";
import { AdminController } from "./modules/admin/admin.controller.js";
import { PrismaAdminRepository, type AdminRepository } from "./modules/admin/admin.repository.js";
import { createAdminRouter } from "./modules/admin/admin.routes.js";
import { AdminService } from "./modules/admin/admin.service.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { PrismaAuthRepository, type AuthRepository } from "./modules/auth/auth.repository.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { AuthService, type AuthTokenDispatcher } from "./modules/auth/auth.service.js";
import { BillingController } from "./modules/billing/billing.controller.js";
import {
  PrismaBillingRepository,
  type BillingRepository,
} from "./modules/billing/billing.repository.js";
import { createBillingRouter } from "./modules/billing/billing.routes.js";
import { BillingService } from "./modules/billing/billing.service.js";
import { CollectionsController } from "./modules/collections/collections.controller.js";
import {
  PrismaCollectionsRepository,
  type CollectionsRepository,
} from "./modules/collections/collections.repository.js";
import { createCollectionsRouter } from "./modules/collections/collections.routes.js";
import { CollectionsService } from "./modules/collections/collections.service.js";
import { ConsentController } from "./modules/consent/consent.controller.js";
import {
  PrismaConsentRepository,
  type ConsentRepository,
} from "./modules/consent/consent.repository.js";
import { createConsentRouter } from "./modules/consent/consent.routes.js";
import { ConsentService } from "./modules/consent/consent.service.js";
import { SearchesController } from "./modules/searches/searches.controller.js";
import {
  PrismaSearchesRepository,
  type SearchesRepository,
} from "./modules/searches/searches.repository.js";
import { createSearchesRouter } from "./modules/searches/searches.routes.js";
import { SearchesService } from "./modules/searches/searches.service.js";
import { UploadsController } from "./modules/uploads/uploads.controller.js";
import {
  PrismaUploadsRepository,
  type UploadsRepository,
} from "./modules/uploads/uploads.repository.js";
import { createUploadsRouter } from "./modules/uploads/uploads.routes.js";
import { UploadsService } from "./modules/uploads/uploads.service.js";
import { UsersController } from "./modules/users/users.controller.js";
import { PrismaUsersRepository, type UsersRepository } from "./modules/users/users.repository.js";
import { createUsersRouter } from "./modules/users/users.routes.js";
import { UsersService } from "./modules/users/users.service.js";
import { WorkspacesController } from "./modules/workspaces/workspaces.controller.js";
import {
  PrismaWorkspacesRepository,
  type WorkspacesRepository,
} from "./modules/workspaces/workspaces.repository.js";
import { createWorkspacesRouter } from "./modules/workspaces/workspaces.routes.js";
import { WorkspacesService } from "./modules/workspaces/workspaces.service.js";
import { openApiSpec } from "./openapi.js";
import { HttpAiServiceClient, type AiServiceClient } from "./lib/ai-client.js";
import { BullMqSearchQueue, InMemorySearchQueue, type SearchQueueAdapter } from "./lib/queue.js";
import { LocalPrivateStorageAdapter, type PrivateStorageAdapter } from "./lib/storage.js";
import { SearchesWorker } from "./modules/searches/searches.worker.js";

export interface CreateAppOptions {
  authRepository?: AuthRepository;
  dispatchToken?: AuthTokenDispatcher;
  usersRepository?: UsersRepository;
  workspacesRepository?: WorkspacesRepository;
  collectionsRepository?: CollectionsRepository;
  consentRepository?: ConsentRepository;
  uploadsRepository?: UploadsRepository;
  storageAdapter?: PrivateStorageAdapter;
  searchesRepository?: SearchesRepository;
  searchQueue?: SearchQueueAdapter;
  aiClient?: AiServiceClient;
  billingRepository?: BillingRepository;
  adminRepository?: AdminRepository;
}

/**
 * Builds and configures the Express application without binding a network port.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const helmetMiddleware = helmet({
    contentSecurityPolicy: false,
  }) as unknown as express.RequestHandler;

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
  app.use(requestLoggerMiddleware);
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

  // OpenAPI JSON & Swagger UI
  app.get("/api/openapi.json", (_req, res) => {
    res.status(200).json(openApiSpec);
  });
  app.use(
    "/api/docs",
    ...(swaggerUi.serve as unknown as express.RequestHandler[]),
    swaggerUi.setup(openApiSpec) as unknown as express.RequestHandler,
  );

  const authRepo = options.authRepository ?? new PrismaAuthRepository();
  const resolveWorkspaceRole = (wsId: string, userId: string) =>
    authRepo.getWorkspaceRole(wsId, userId);

  // 1. Auth
  const authService = new AuthService(authRepo, options.dispatchToken);
  const authController = new AuthController(authService);
  app.use("/api/v1/auth", createAuthRouter(authController));

  // 2. Users
  const usersRepo = options.usersRepository ?? new PrismaUsersRepository();
  const usersController = new UsersController(new UsersService(usersRepo));
  app.use("/api/v1/users", createUsersRouter(usersController));

  // 3. Workspaces
  const workspacesRepo = options.workspacesRepository ?? new PrismaWorkspacesRepository();
  const workspacesController = new WorkspacesController(new WorkspacesService(workspacesRepo));
  app.use("/api/v1/workspaces", createWorkspacesRouter(workspacesController, resolveWorkspaceRole));

  app.get(
    "/api/v1/workspaces/:workspaceId/access-check",
    requireAuth,
    requireWorkspaceRole(["OWNER", "MEMBER", "VIEWER"], resolveWorkspaceRole),
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

  // 4. Collections
  const collectionsRepo = options.collectionsRepository ?? new PrismaCollectionsRepository();
  const collectionsController = new CollectionsController(new CollectionsService(collectionsRepo));
  app.use(
    "/api/v1/workspaces/:workspaceId/collections",
    createCollectionsRouter(collectionsController, resolveWorkspaceRole),
  );

  // 5. Consent
  const consentRepo = options.consentRepository ?? new PrismaConsentRepository();
  const consentController = new ConsentController(new ConsentService(consentRepo));
  app.use(
    "/api/v1/workspaces/:workspaceId/consent",
    createConsentRouter(consentController, resolveWorkspaceRole),
  );

  // 6. Uploads
  const uploadsRepo = options.uploadsRepository ?? new PrismaUploadsRepository();
  const storageAdapter = options.storageAdapter ?? new LocalPrivateStorageAdapter();
  const uploadsController = new UploadsController(new UploadsService(uploadsRepo, storageAdapter));
  app.use(
    "/api/v1/workspaces/:workspaceId/uploads",
    createUploadsRouter(uploadsController, resolveWorkspaceRole),
  );

  // 7. Searches & Background Worker
  const searchesRepo = options.searchesRepository ?? new PrismaSearchesRepository();
  const searchQueue =
    options.searchQueue ??
    (env.redisUrl && env.nodeEnv !== "test"
      ? new BullMqSearchQueue(env.redisUrl)
      : new InMemorySearchQueue());
  const aiClient = options.aiClient ?? new HttpAiServiceClient();
  const searchesWorker = new SearchesWorker(searchesRepo, aiClient, storageAdapter);
  searchQueue.registerProcessor((payload) => searchesWorker.process(payload));

  const searchesController = new SearchesController(new SearchesService(searchesRepo, searchQueue));
  app.use(
    "/api/v1/workspaces/:workspaceId/searches",
    createSearchesRouter(searchesController, resolveWorkspaceRole),
  );

  // 8. Billing & Razorpay Webhooks
  const billingRepo = options.billingRepository ?? new PrismaBillingRepository();
  const billingController = new BillingController(new BillingService(billingRepo));
  app.use(
    "/api/v1/workspaces/:workspaceId/billing",
    createBillingRouter(billingController, resolveWorkspaceRole),
  );
  app.post("/api/v1/billing/webhooks/razorpay", billingController.handleWebhook);

  // 9. Admin
  const adminRepo = options.adminRepository ?? new PrismaAdminRepository();
  const adminController = new AdminController(new AdminService(adminRepo));
  app.use("/api/v1/admin", createAdminRouter(adminController));

  app.use(errorHandler);

  return app;
}
