import { prisma } from "@app/database";
import type { AdminOverviewDto, AuditLogDto, UserDto, UserRole } from "@app/types";

export interface AdminWorkspaceSummaryDto {
  id: string;
  name: string;
  slug: string;
  retentionDays: number;
  memberCount: number;
  collectionCount: number;
  createdAt: string;
}

export interface AdminSubscriptionSummaryDto {
  id: string;
  workspaceId: string;
  workspaceName: string;
  planCode: string;
  status: string;
  monthlySearchLimit: number;
  currentPeriodEnd: string;
}

export interface AdminPaymentSummaryDto {
  id: string;
  workspaceId: string;
  workspaceName: string;
  amountCents: number;
  currency: string;
  status: string;
  externalRef: string | null;
  createdAt: string;
}

export interface AdminAnalyticsDto {
  searchesByStatus: Record<string, number>;
  consentsByStatus: Record<string, number>;
  totalEnrolledImages: number;
}

export interface AdminDeletionRequestDto {
  imageId: string;
  workspaceId: string;
  collectionId: string;
  consentStatus: string;
  storageKey: string;
  updatedAt: string;
}

export interface AdminSystemHealthDto {
  apiStatus: "ok";
  uptimeSeconds: number;
  memoryRssMb: number;
  databaseStatus: "ok" | "unreachable";
  aiServiceStatus: "ok" | "unreachable";
  timestamp: string;
}

export interface AdminRepository {
  getOverview(): Promise<AdminOverviewDto>;
  listUsers(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: UserDto[]; total: number }>;
  listWorkspaces(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminWorkspaceSummaryDto[]; total: number }>;
  listAuditLogs(query: {
    page: number;
    limit: number;
    workspaceId?: string;
    action?: string;
  }): Promise<{ items: AuditLogDto[]; total: number }>;
  listSubscriptions(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminSubscriptionSummaryDto[]; total: number }>;
  listPayments(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminPaymentSummaryDto[]; total: number }>;
  getAnalytics(): Promise<AdminAnalyticsDto>;
  listDeletionRequests(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminDeletionRequestDto[]; total: number }>;
  purgeDeletionRequest(imageId: string, actorId: string): Promise<string | null>;
  checkDatabaseHealth(): Promise<boolean>;
}

export class PrismaAdminRepository implements AdminRepository {
  async getOverview(): Promise<AdminOverviewDto> {
    const [totalUsers, totalWorkspaces, totalCollections, totalSearches] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.collection.count({ where: { status: { not: "DELETED" } } }),
      prisma.search.count({ where: { deletedAt: null } }),
    ]);
    return { totalUsers, totalWorkspaces, totalCollections, totalSearches };
  }

  async listUsers(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: UserDto[]; total: number }> {
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.user.count(),
    ]);
    return {
      items: rows.map(
        (u: {
          id: string;
          email: string;
          name: string;
          role: UserRole;
          emailVerifiedAt: Date | null;
          createdAt: Date;
        }) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          emailVerifiedAt: u.emailVerifiedAt ? u.emailVerifiedAt.toISOString() : null,
          createdAt: u.createdAt.toISOString(),
        }),
      ),
      total,
    };
  }

  async listWorkspaces(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminWorkspaceSummaryDto[]; total: number }> {
    const [rows, total] = await Promise.all([
      prisma.workspace.findMany({
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: {
          _count: {
            select: {
              members: true,
              collections: { where: { status: { not: "DELETED" } } },
            },
          },
        },
      }),
      prisma.workspace.count(),
    ]);
    return {
      items: rows.map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        retentionDays: w.retentionDays,
        memberCount: w._count.members,
        collectionCount: w._count.collections,
        createdAt: w.createdAt.toISOString(),
      })),
      total,
    };
  }

  async listAuditLogs(query: {
    page: number;
    limit: number;
    workspaceId?: string;
    action?: string;
  }): Promise<{ items: AuditLogDto[]; total: number }> {
    const where = {
      ...(query.workspaceId ? { workspaceId: query.workspaceId } : {}),
      ...(query.action ? { action: query.action } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        workspaceId: r.workspaceId,
        actorId: r.actorId,
        action: r.action,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    };
  }

  async listSubscriptions(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminSubscriptionSummaryDto[]; total: number }> {
    const [rows, total] = await Promise.all([
      prisma.subscription.findMany({
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: { workspace: { select: { name: true } } },
      }),
      prisma.subscription.count(),
    ]);
    return {
      items: rows.map((s) => ({
        id: s.id,
        workspaceId: s.workspaceId,
        workspaceName: s.workspace.name,
        planCode: s.planCode,
        status: s.status,
        monthlySearchLimit: s.monthlySearchLimit,
        currentPeriodEnd: s.currentPeriodEnd.toISOString(),
      })),
      total,
    };
  }

  async listPayments(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminPaymentSummaryDto[]; total: number }> {
    const [rows, total] = await Promise.all([
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: { workspace: { select: { name: true } } },
      }),
      prisma.payment.count(),
    ]);
    return {
      items: rows.map((p) => ({
        id: p.id,
        workspaceId: p.workspaceId,
        workspaceName: p.workspace.name,
        amountCents: p.amountCents,
        currency: p.currency,
        status: p.status,
        externalRef: p.externalRef,
        createdAt: p.createdAt.toISOString(),
      })),
      total,
    };
  }

  async getAnalytics(): Promise<AdminAnalyticsDto> {
    const [searchGroups, consentGroups, totalEnrolledImages] = await Promise.all([
      prisma.search.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.collectionImage.groupBy({ by: ["consentStatus"], _count: { _all: true } }),
      prisma.collectionImage.count({ where: { deletedAt: null } }),
    ]);

    const searchesByStatus: Record<string, number> = {};
    for (const row of searchGroups) searchesByStatus[row.status] = row._count._all;

    const consentsByStatus: Record<string, number> = {};
    for (const row of consentGroups) consentsByStatus[row.consentStatus] = row._count._all;

    return { searchesByStatus, consentsByStatus, totalEnrolledImages };
  }

  async listDeletionRequests(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: AdminDeletionRequestDto[]; total: number }> {
    const where = {
      consentStatus: {
        in: ["WITHDRAWN", "PENDING_DELETION"] as ("WITHDRAWN" | "PENDING_DELETION")[],
      },
    };
    const [rows, total] = await Promise.all([
      prisma.collectionImage.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.collectionImage.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        imageId: r.id,
        workspaceId: r.workspaceId,
        collectionId: r.collectionId,
        consentStatus: r.consentStatus,
        storageKey: r.storageKey,
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
    };
  }

  async purgeDeletionRequest(imageId: string, actorId: string): Promise<string | null> {
    const existing = await prisma.collectionImage.findUnique({ where: { id: imageId } });
    if (!existing) return null;

    await prisma.$transaction(async (tx) => {
      await tx.collectionImage.update({
        where: { id: imageId },
        data: { consentStatus: "DELETED", deletedAt: existing.deletedAt ?? new Date() },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: existing.workspaceId,
          actorId,
          action: "ADMIN_IMAGE_PURGED",
          resourceType: "CollectionImage",
          resourceId: imageId,
        },
      });
    });

    return existing.storageKey;
  }

  async checkDatabaseHealth(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
