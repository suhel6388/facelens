import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { ApiSuccessResponse, HealthStatusDto } from "@app/types";
import { errorHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";

/**
 * Builds and configures the Express application without binding a network port.
 */
export function createApp(): Express {
  const app = express();
  const helmetMiddleware = helmet() as unknown as express.RequestHandler;

  app.use(helmetMiddleware);
  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(requestIdMiddleware);

  const healthHandler = (_req: express.Request, res: express.Response): void => {
    const payload: ApiSuccessResponse<HealthStatusDto> = {
      data: {
        status: "ok",
        service: "api",
        version: "0.1.0",
      },
      meta: {
        requestId: res.getHeader("x-request-id")?.toString() ?? "unknown",
        timestamp: new Date().toISOString(),
      },
    };
    res.status(200).json(payload);
  };

  app.get("/health", healthHandler);
  app.get("/api/v1/health", healthHandler);

  app.use(errorHandler);

  return app;
}
