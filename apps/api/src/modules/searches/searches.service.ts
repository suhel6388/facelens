import crypto from "node:crypto";
import type { SearchDto } from "@app/types";
import type { CreateSearchInput } from "@app/validation";
import { AppError } from "../../middleware/error-handler.js";
import type { SearchesRepository, SearchWithResultsDto } from "./searches.repository.js";

export class SearchesService {
  constructor(private readonly repo: SearchesRepository) {}

  async list(
    workspaceId: string,
    pagination: { page: number; limit: number },
  ): Promise<{ items: SearchDto[]; total: number }> {
    return this.repo.list(workspaceId, pagination);
  }

  async create(workspaceId: string, userId: string, input: CreateSearchInput): Promise<SearchDto> {
    const info = await this.repo.getWorkspaceRetentionAndCollection(
      workspaceId,
      input.collectionId,
    );
    if (!info || !info.collectionActive) {
      throw new AppError(
        404,
        "COLLECTION_NOT_FOUND",
        "Active collection not found in this workspace.",
      );
    }

    const retentionExpiresAt = new Date(Date.now() + info.retentionDays * 24 * 60 * 60 * 1000);
    const queryStorageKey = `workspaces/${workspaceId}/queries/${crypto.randomUUID()}.bin`;

    return this.repo.createSearch({
      workspaceId,
      userId,
      collectionId: input.collectionId,
      queryStorageKey,
      retentionExpiresAt,
    });
  }

  async getById(workspaceId: string, searchId: string): Promise<SearchWithResultsDto> {
    const found = await this.repo.findByIdWithResults(workspaceId, searchId);
    if (!found) {
      throw new AppError(404, "SEARCH_NOT_FOUND", "Search job not found.");
    }
    return found;
  }

  async cancel(workspaceId: string, searchId: string): Promise<SearchDto> {
    const cancelled = await this.repo.cancelSearch(workspaceId, searchId);
    if (!cancelled) {
      throw new AppError(404, "SEARCH_NOT_FOUND", "Search job not found.");
    }
    return cancelled;
  }

  async remove(workspaceId: string, searchId: string, actorId: string): Promise<void> {
    const deleted = await this.repo.softDeleteSearch(workspaceId, searchId, actorId);
    if (!deleted) {
      throw new AppError(404, "SEARCH_NOT_FOUND", "Search job not found.");
    }
  }
}
