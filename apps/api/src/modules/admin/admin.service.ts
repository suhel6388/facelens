import type { AdminOverviewDto, AuditLogDto, UserDto } from "@app/types";
import type { AdminRepository, AdminWorkspaceSummaryDto } from "./admin.repository.js";

export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

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
}
