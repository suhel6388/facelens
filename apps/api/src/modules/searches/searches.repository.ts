import { prisma } from "@app/database";
import type { SearchDto, SearchResultDto, SearchStatus } from "@app/types";

export const SIMILARITY_DISCLAIMER =
  "Similarity estimates indicate visual proximity within your authorized collection and do not constitute positive identification.";

export interface SearchWithResultsDto {
  search: SearchDto;
  results: SearchResultDto[];
}

export interface SearchesRepository {
  list(
    workspaceId: string,
    pagination: { page: number; limit: number },
  ): Promise<{ items: SearchDto[]; total: number }>;
  getWorkspaceRetentionAndCollection(
    workspaceId: string,
    collectionId: string,
  ): Promise<{ retentionDays: number; collectionActive: boolean } | null>;
  createSearch(params: {
    workspaceId: string;
    userId: string;
    collectionId: string;
    queryStorageKey: string;
    retentionExpiresAt: Date;
  }): Promise<SearchDto>;
  findByIdWithResults(workspaceId: string, searchId: string): Promise<SearchWithResultsDto | null>;
  cancelSearch(workspaceId: string, searchId: string): Promise<SearchDto | null>;
  softDeleteSearch(workspaceId: string, searchId: string, actorId: string): Promise<boolean>;
}

function toSearchDto(row: {
  id: string;
  workspaceId: string;
  collectionId: string;
  status: SearchStatus;
  resultCount: number;
  retentionExpiresAt: Date;
  createdAt: Date;
  completedAt: Date | null;
}): SearchDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    collectionId: row.collectionId,
    status: row.status,
    resultCount: row.resultCount,
    retentionExpiresAt: row.retentionExpiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

export class PrismaSearchesRepository implements SearchesRepository {
  async list(
    workspaceId: string,
    pagination: { page: number; limit: number },
  ): Promise<{ items: SearchDto[]; total: number }> {
    const where = { workspaceId, deletedAt: null };
    const [rows, total] = await Promise.all([
      prisma.search.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.search.count({ where }),
    ]);
    return { items: rows.map(toSearchDto), total };
  }

  async getWorkspaceRetentionAndCollection(
    workspaceId: string,
    collectionId: string,
  ): Promise<{ retentionDays: number; collectionActive: boolean } | null> {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { retentionDays: true },
    });
    if (!ws) return null;
    const col = await prisma.collection.findFirst({
      where: { id: collectionId, workspaceId, status: "ACTIVE" },
      select: { id: true },
    });
    return { retentionDays: ws.retentionDays, collectionActive: Boolean(col) };
  }

  async createSearch(params: {
    workspaceId: string;
    userId: string;
    collectionId: string;
    queryStorageKey: string;
    retentionExpiresAt: Date;
  }): Promise<SearchDto> {
    const created = await prisma.$transaction(async (tx) => {
      const search = await tx.search.create({
        data: {
          workspaceId: params.workspaceId,
          userId: params.userId,
          collectionId: params.collectionId,
          queryStorageKey: params.queryStorageKey,
          status: "QUEUED",
          retentionExpiresAt: params.retentionExpiresAt,
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          actorId: params.userId,
          action: "SEARCH_CREATED",
          resourceType: "Search",
          resourceId: search.id,
          metadataJson: { collectionId: params.collectionId },
        },
      });
      return search;
    });
    return toSearchDto(created);
  }

  async findByIdWithResults(
    workspaceId: string,
    searchId: string,
  ): Promise<SearchWithResultsDto | null> {
    const row = await prisma.search.findFirst({
      where: { id: searchId, workspaceId, deletedAt: null },
      include: {
        results: {
          orderBy: { rank: "asc" },
        },
      },
    });
    if (!row) return null;
    return {
      search: toSearchDto(row),
      results: row.results.map((r) => ({
        id: r.id,
        searchId: r.searchId,
        collectionImageId: r.collectionImageId,
        similarityEstimate: r.similarityEstimate,
        rank: r.rank,
        disclaimer: SIMILARITY_DISCLAIMER,
      })),
    };
  }

  async cancelSearch(workspaceId: string, searchId: string): Promise<SearchDto | null> {
    const existing = await prisma.search.findFirst({
      where: { id: searchId, workspaceId, deletedAt: null },
    });
    if (!existing) return null;
    if (!["QUEUED", "VALIDATING", "PROCESSING"].includes(existing.status)) {
      return toSearchDto(existing);
    }
    const updated = await prisma.search.update({
      where: { id: searchId },
      data: { status: "CANCELLED" },
    });
    return toSearchDto(updated);
  }

  async softDeleteSearch(workspaceId: string, searchId: string, actorId: string): Promise<boolean> {
    const existing = await prisma.search.findFirst({
      where: { id: searchId, workspaceId, deletedAt: null },
    });
    if (!existing) return false;
    await prisma.$transaction(async (tx) => {
      await tx.search.update({
        where: { id: searchId },
        data: { status: "DELETED", deletedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          workspaceId,
          actorId,
          action: "SEARCH_DELETED",
          resourceType: "Search",
          resourceId: searchId,
        },
      });
    });
    return true;
  }
}
