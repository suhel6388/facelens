import { prisma } from "@app/database";
import type {
  WorkspaceDetailDto,
  WorkspaceDto,
  WorkspaceMemberDto,
  WorkspaceRole,
} from "@app/types";

export interface WorkspacesRepository {
  listForUser(userId: string): Promise<WorkspaceDto[]>;
  createWorkspace(params: { userId: string; name: string; slug: string }): Promise<WorkspaceDto>;
  findDetail(workspaceId: string, userId: string): Promise<WorkspaceDetailDto | null>;
  updateWorkspace(
    workspaceId: string,
    data: { name?: string; retentionDays?: number },
  ): Promise<WorkspaceDetailDto | null>;
  listMembers(workspaceId: string): Promise<WorkspaceMemberDto[]>;
  findUserByEmail(email: string): Promise<{ id: string; email: string; name: string } | null>;
  findMemberByUser(workspaceId: string, userId: string): Promise<WorkspaceMemberDto | null>;
  addMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMemberDto>;
  updateMemberRole(
    workspaceId: string,
    memberId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMemberDto | null>;
  removeMember(workspaceId: string, memberId: string): Promise<boolean>;
}

export class PrismaWorkspacesRepository implements WorkspacesRepository {
  async listForUser(userId: string): Promise<WorkspaceDto[]> {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      createdAt: m.workspace.createdAt.toISOString(),
    }));
  }

  async createWorkspace(params: {
    userId: string;
    name: string;
    slug: string;
  }): Promise<WorkspaceDto> {
    const ws = await prisma.workspace.create({
      data: {
        name: params.name,
        slug: params.slug,
        members: {
          create: {
            userId: params.userId,
            role: "OWNER",
          },
        },
      },
    });
    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      role: "OWNER",
      createdAt: ws.createdAt.toISOString(),
    };
  }

  async findDetail(workspaceId: string, userId: string): Promise<WorkspaceDetailDto | null> {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                members: true,
                collections: { where: { status: { not: "DELETED" } } },
              },
            },
          },
        },
      },
    });
    if (!membership) return null;
    const ws = membership.workspace;
    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      retentionDays: ws.retentionDays,
      role: membership.role,
      memberCount: ws._count.members,
      collectionCount: ws._count.collections,
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
    };
  }

  async updateWorkspace(
    workspaceId: string,
    data: { name?: string; retentionDays?: number },
  ): Promise<WorkspaceDetailDto | null> {
    const existing = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!existing) return null;
    const ws = await prisma.workspace.update({
      where: { id: workspaceId },
      data,
      include: {
        _count: {
          select: {
            members: true,
            collections: { where: { status: { not: "DELETED" } } },
          },
        },
      },
    });
    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      retentionDays: ws.retentionDays,
      role: "OWNER",
      memberCount: ws._count.members,
      collectionCount: ws._count.collections,
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
    };
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
    const rows = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      userId: r.userId,
      email: r.user.email,
      name: r.user.name,
      role: r.role,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async findUserByEmail(
    email: string,
  ): Promise<{ id: string; email: string; name: string } | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true },
    });
  }

  async findMemberByUser(workspaceId: string, userId: string): Promise<WorkspaceMemberDto | null> {
    const row = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!row) return null;
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      email: row.user.email,
      name: row.user.name,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMemberDto> {
    const row = await prisma.workspaceMember.create({
      data: { workspaceId, userId, role },
      include: { user: { select: { email: true, name: true } } },
    });
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      email: row.user.email,
      name: row.user.name,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMemberDto | null> {
    const existing = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!existing) return null;
    const row = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: { select: { email: true, name: true } } },
    });
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      email: row.user.email,
      name: row.user.name,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async removeMember(workspaceId: string, memberId: string): Promise<boolean> {
    const existing = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!existing) return false;
    await prisma.workspaceMember.delete({ where: { id: memberId } });
    return true;
  }
}
