import { prisma } from "@app/database";
import type { SearchDto, SearchResultDto, SearchStatus } from "@app/types";

export const SIMILARITY_DISCLAIMER =
  "Similarity estimates indicate visual proximity within your authorized collection and do not constitute positive identification.";

export interface SearchWithResultsDto {
  search: SearchDto;
  results: SearchResultDto[];
  collection?: {
    id: string;
    name: string;
    purpose: string;
  };
}

export interface SearchesRepository {
  list(
    workspaceId: string,
    pagination: { page: number; limit: number },
  ): Promise<{ items: SearchDto[]; total: number }>;
  getWorkspaceRetentionAndCollection(
    workspaceId: string,
    collectionId: string,
  ): Promise<{
    retentionDays: number;
    collectionActive: boolean;
    consentedImageCount: number;
  } | null>;
  getMonthlyUsageAndLimit(workspaceId: string): Promise<{ used: number; limit: number }>;
  createSearch(params: {
    workspaceId: string;
    userId: string;
    collectionId: string;
    queryStorageKey: string;
    retentionExpiresAt: Date;
  }): Promise<SearchDto>;
  findByIdWithResults(workspaceId: string, searchId: string): Promise<SearchWithResultsDto | null>;
  updateStatus(searchId: string, status: SearchStatus, errorCode?: string): Promise<void>;
  saveResults(
    searchId: string,
    workspaceId: string,
    results: { collectionImageId: string; similarityEstimate: number; rank: number }[],
  ): Promise<void>;
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
  ): Promise<{
    retentionDays: number;
    collectionActive: boolean;
    consentedImageCount: number;
  } | null> {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { retentionDays: true },
    });
    if (!ws) return null;
    const col = await prisma.collection.findFirst({
      where: { id: collectionId, workspaceId, status: "ACTIVE" },
      select: { id: true },
    });
    const consentedImageCount = col
      ? await prisma.collectionImage.count({
          where: {
            workspaceId,
            collectionId,
            consentStatus: "GRANTED",
            deletedAt: null,
          },
        })
      : 0;
    return {
      retentionDays: ws.retentionDays,
      collectionActive: Boolean(col),
      consentedImageCount,
    };
  }

  async getMonthlyUsageAndLimit(workspaceId: string): Promise<{ used: number; limit: number }> {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [used, sub] = await Promise.all([
      prisma.search.count({
        where: { workspaceId, createdAt: { gte: startOfMonth }, deletedAt: null },
      }),
      prisma.subscription.findFirst({
        where: { workspaceId, status: { in: ["ACTIVE", "TRIALING"] } },
        orderBy: { createdAt: "desc" },
        select: { monthlySearchLimit: true },
      }),
    ]);

    return { used, limit: sub?.monthlySearchLimit ?? 25 };
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
        collection: { select: { id: true, name: true, purpose: true } },
        results: {
          orderBy: { rank: "asc" },
        },
      },
    });
    if (!row) return null;
    return {
      search: toSearchDto(row),
      collection: row.collection,
      results: row.results.map((r) => ({
        id: r.id,
        searchId: r.searchId,
        collectionImageId: r.collectionImageId,
        similarityEstimate: r.similarityEstimate,
        rank: r.rank,
        disclaimer: SIMILARITY_DISCLAIMER,
        previewUrl: `/api/v1/workspaces/${workspaceId}/uploads/images/${r.collectionImageId}/content`,
      })),
    };
  }

  async updateStatus(searchId: string, status: SearchStatus, errorCode?: string): Promise<void> {
    await prisma.search.update({
      where: { id: searchId },
      data: {
        status,
        ...(errorCode !== undefined ? { errorCode } : {}),
        ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });
  }

  async saveResults(
    searchId: string,
    workspaceId: string,
    results: { collectionImageId: string; similarityEstimate: number; rank: number }[],
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      if (results.length > 0) {
        await tx.searchResult.createMany({
          data: results.map((r) => ({
            workspaceId,
            searchId,
            collectionImageId: r.collectionImageId,
            similarityEstimate: r.similarityEstimate,
            rank: r.rank,
          })),
        });
      }
      await tx.search.update({
        where: { id: searchId },
        data: {
          status: "COMPLETED",
          resultCount: results.length,
          completedAt: new Date(),
        },
      });
    });
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
