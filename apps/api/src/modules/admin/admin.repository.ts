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
}
