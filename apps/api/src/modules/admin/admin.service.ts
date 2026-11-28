import type { AdminOverviewDto, AuditLogDto, UserDto } from "@app/types";
import { env } from "../../config/env.js";
import type { PrivateStorageAdapter } from "../../lib/storage.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  AdminAnalyticsDto,
  AdminDeletionRequestDto,
  AdminPaymentSummaryDto,
  AdminRepository,
  AdminSubscriptionSummaryDto,
  AdminSystemHealthDto,
  AdminWorkspaceSummaryDto,
} from "./admin.repository.js";

export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly storage?: PrivateStorageAdapter,
  ) {}

  async getOverview(): Promise<AdminOverviewDto> {
    return this.repo.getOverview();
  }

  async listUsers(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: UserDto[]; total: number }> {
    return this.repo.listUsers(pagination);
  }

  async listWorkspaces(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminWorkspaceSummaryDto[]; total: number }> {
    return this.repo.listWorkspaces(pagination);
  }

  async listAuditLogs(query: {
    page: number;
    limit: number;
    workspaceId?: string;
    action?: string;
  }): Promise<{ items: AuditLogDto[]; total: number }> {
    return this.repo.listAuditLogs(query);
  }

  async listSubscriptions(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminSubscriptionSummaryDto[]; total: number }> {
    return this.repo.listSubscriptions(pagination);
  }

  async listPayments(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminPaymentSummaryDto[]; total: number }> {
    return this.repo.listPayments(pagination);
  }

  async getAnalytics(): Promise<AdminAnalyticsDto> {
    return this.repo.getAnalytics();
  }

  async listDeletionRequests(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminDeletionRequestDto[]; total: number }> {
    return this.repo.listDeletionRequests(pagination);
  }

  async purgeDeletionRequest(imageId: string, actorId: string): Promise<void> {
    const storageKey = await this.repo.purgeDeletionRequest(imageId, actorId);
    if (!storageKey) {
      throw new AppError(404, "IMAGE_NOT_FOUND", "Deletion request target not found.");
    }
    await this.storage?.deleteObject(storageKey);
  }

  async getSystemHealth(): Promise<AdminSystemHealthDto> {
    const dbOk = await this.repo.checkDatabaseHealth();
    let aiOk = false;
    try {
      const res = await fetch(`${env.aiServiceUrl}/health`, {
        signal: AbortSignal.timeout(1500),
      });
      aiOk = res.ok;
    } catch {
      aiOk = false;
    }

    return {
      apiStatus: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      memoryRssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      databaseStatus: dbOk ? "ok" : "unreachable",
      aiServiceStatus: aiOk ? "ok" : "unreachable",
      timestamp: new Date().toISOString(),
    };
  }
}
