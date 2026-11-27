import { prisma, type AuthTokenType } from "@app/database";
import type { UserRole, WorkspaceRole } from "@app/types";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export interface WorkspaceWithRoleRecord {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  createdAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface AuthTokenRecord {
  id: string;
  userId: string;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUserWithWorkspace(input: {
    email: string;
    passwordHash: string;
    name: string;
    workspaceName: string;
    workspaceSlug: string;
  }): Promise<{ user: UserRecord; workspace: WorkspaceWithRoleRecord }>;
  markEmailVerified(userId: string, verifiedAt: Date): Promise<void>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  listUserWorkspaces(userId: string): Promise<WorkspaceWithRoleRecord[]>;
  getWorkspaceRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null>;
  createSession(input: {
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
  }): Promise<SessionRecord>;
  findSessionByRefreshHash(refreshTokenHash: string): Promise<SessionRecord | null>;
  rotateSessionRefreshHash(
    sessionId: string,
    newRefreshTokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  revokeSession(sessionId: string, userId: string): Promise<boolean>;
  revokeAllUserSessions(userId: string): Promise<void>;
  listActiveSessions(userId: string): Promise<SessionRecord[]>;
  createAuthToken(input: {
    userId: string;
    type: AuthTokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<AuthTokenRecord>;
  findValidAuthToken(tokenHash: string, type: AuthTokenType): Promise<AuthTokenRecord | null>;
  consumeAuthToken(tokenId: string): Promise<void>;
  writeAuditLog(input: {
    workspaceId?: string | null;
    actorId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
  }): Promise<void>;
}

export class PrismaAuthRepository implements AuthRepository {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async createUserWithWorkspace(input: {
    email: string;
    passwordHash: string;
    name: string;
    workspaceName: string;
    workspaceSlug: string;
  }): Promise<{ user: UserRecord; workspace: WorkspaceWithRoleRecord }> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash: input.passwordHash,
          name: input.name,
        },
      });
      const workspace = await tx.workspace.create({
        data: {
          name: input.workspaceName,
          slug: input.workspaceSlug,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
      });
      return {
        user,
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          role: "OWNER",
          createdAt: workspace.createdAt,
        },
      };
    });
  }

  async markEmailVerified(userId: string, verifiedAt: Date): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: verifiedAt },
    });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async listUserWorkspaces(userId: string): Promise<WorkspaceWithRoleRecord[]> {
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
      createdAt: m.workspace.createdAt,
    }));
  }

  async getWorkspaceRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    return member?.role ?? null;
  }

  async createSession(input: {
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    return prisma.session.create({ data: input });
  }

  async findSessionByRefreshHash(refreshTokenHash: string): Promise<SessionRecord | null> {
    return prisma.session.findUnique({ where: { refreshTokenHash } });
  }

  async rotateSessionRefreshHash(
    sessionId: string,
    newRefreshTokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { refreshTokenHash: newRefreshTokenHash, expiresAt },
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count > 0;
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listActiveSessions(userId: string): Promise<SessionRecord[]> {
    return prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
  }

  async createAuthToken(input: {
    userId: string;
    type: AuthTokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<AuthTokenRecord> {
    return prisma.authToken.create({ data: input });
  }

  async findValidAuthToken(
    tokenHash: string,
    type: AuthTokenType,
  ): Promise<AuthTokenRecord | null> {
    return prisma.authToken.findFirst({
      where: {
        tokenHash,
        type,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async consumeAuthToken(tokenId: string): Promise<void> {
    await prisma.authToken.update({
      where: { id: tokenId },
      data: { consumedAt: new Date() },
    });
  }

  async writeAuditLog(input: {
    workspaceId?: string | null;
    actorId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        workspaceId: input.workspaceId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
      },
    });
  }
}
