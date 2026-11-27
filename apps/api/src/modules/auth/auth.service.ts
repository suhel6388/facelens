import type { AuthMeDto, SessionDto, UserDto, WorkspaceDto } from "@app/types";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "@app/validation";
import { env } from "../../config/env.js";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  signAccessToken,
  verifyPassword,
} from "../../lib/auth-crypto.js";
import { AppError } from "../../middleware/error-handler.js";
import type { AuthRepository, UserRecord, WorkspaceWithRoleRecord } from "./auth.repository.js";

export interface AuthTokenDispatchEvent {
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET";
  email: string;
  token: string;
}

export type AuthTokenDispatcher = (event: AuthTokenDispatchEvent) => void;

export interface AuthServiceResult {
  me: AuthMeDto;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

function toWorkspaceDto(ws: WorkspaceWithRoleRecord): WorkspaceDto {
  return {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    role: ws.role,
    createdAt: ws.createdAt.toISOString(),
  };
}

function buildSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  const suffix = generateOpaqueToken(3);
  return `${base || "workspace"}-${suffix}`;
}

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly dispatchToken?: AuthTokenDispatcher,
  ) {}

  async register(
    input: RegisterInput,
    meta: { userAgent: string | null; ipAddress: string | null },
  ): Promise<AuthServiceResult> {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw new AppError(409, "EMAIL_IN_USE", "An account with this email already exists.");
    }

    const passwordHash = await hashPassword(input.password);
    const workspaceName = `${input.name.split(" ")[0] ?? "My"}'s Workspace`;
    const { user, workspace } = await this.repo.createUserWithWorkspace({
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      workspaceName,
      workspaceSlug: buildSlug(workspaceName),
    });

    const verificationToken = generateOpaqueToken(32);
    await this.repo.createAuthToken({
      userId: user.id,
      type: "EMAIL_VERIFICATION",
      tokenHash: hashOpaqueToken(verificationToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    this.dispatchToken?.({
      type: "EMAIL_VERIFICATION",
      email: user.email,
      token: verificationToken,
    });

    const tokens = await this.issueSessionTokens(user, meta);

    await this.repo.writeAuditLog({
      workspaceId: workspace.id,
      actorId: user.id,
      action: "auth.register",
      resourceType: "user",
      resourceId: user.id,
    });

    return {
      me: {
        user: toUserDto(user),
        workspaces: [toWorkspaceDto(workspace)],
      },
      tokens,
    };
  }

  async login(
    input: LoginInput,
    meta: { userAgent: string | null; ipAddress: string | null },
  ): Promise<AuthServiceResult> {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const workspaces = await this.repo.listUserWorkspaces(user.id);
    const tokens = await this.issueSessionTokens(user, meta);

    await this.repo.writeAuditLog({
      actorId: user.id,
      action: "auth.login",
      resourceType: "user",
      resourceId: user.id,
    });

    return {
      me: {
        user: toUserDto(user),
        workspaces: workspaces.map(toWorkspaceDto),
      },
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthServiceResult> {
    const tokenHash = hashOpaqueToken(refreshToken);
    const session = await this.repo.findSessionByRefreshHash(tokenHash);
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh session is invalid or expired.");
    }

    const user = await this.repo.findUserById(session.userId);
    if (!user) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Account no longer exists.");
    }

    const nextRefreshToken = generateOpaqueToken(32);
    const nextExpiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
    await this.repo.rotateSessionRefreshHash(
      session.id,
      hashOpaqueToken(nextRefreshToken),
      nextExpiresAt,
    );

    const accessToken = signAccessToken({
      sub: user.id,
      sid: session.id,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
    });

    const workspaces = await this.repo.listUserWorkspaces(user.id);

    return {
      me: {
        user: toUserDto(user),
        workspaces: workspaces.map(toWorkspaceDto),
      },
      tokens: {
        accessToken,
        refreshToken: nextRefreshToken,
      },
    };
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    if (sessionId) {
      await this.repo.revokeSession(sessionId, userId);
    }
    await this.repo.writeAuditLog({
      actorId: userId,
      action: "auth.logout",
      resourceType: "session",
      resourceId: sessionId || null,
    });
  }

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const tokenRecord = await this.repo.findValidAuthToken(
      hashOpaqueToken(input.token),
      "EMAIL_VERIFICATION",
    );
    if (!tokenRecord) {
      throw new AppError(400, "INVALID_TOKEN", "Verification token is invalid or expired.");
    }

    await this.repo.markEmailVerified(tokenRecord.userId, new Date());
    await this.repo.consumeAuthToken(tokenRecord.id);
    await this.repo.writeAuditLog({
      actorId: tokenRecord.userId,
      action: "auth.email_verified",
      resourceType: "user",
      resourceId: tokenRecord.userId,
    });
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      return;
    }

    const resetToken = generateOpaqueToken(32);
    await this.repo.createAuthToken({
      userId: user.id,
      type: "PASSWORD_RESET",
      tokenHash: hashOpaqueToken(resetToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    this.dispatchToken?.({
      type: "PASSWORD_RESET",
      email: user.email,
      token: resetToken,
    });

    await this.repo.writeAuditLog({
      actorId: user.id,
      action: "auth.password_reset_requested",
      resourceType: "user",
      resourceId: user.id,
    });
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenRecord = await this.repo.findValidAuthToken(
      hashOpaqueToken(input.token),
      "PASSWORD_RESET",
    );
    if (!tokenRecord) {
      throw new AppError(400, "INVALID_TOKEN", "Password reset token is invalid or expired.");
    }

    const newHash = await hashPassword(input.password);
    await this.repo.updatePasswordHash(tokenRecord.userId, newHash);
    await this.repo.consumeAuthToken(tokenRecord.id);
    await this.repo.revokeAllUserSessions(tokenRecord.userId);

    await this.repo.writeAuditLog({
      actorId: tokenRecord.userId,
      action: "auth.password_reset_completed",
      resourceType: "user",
      resourceId: tokenRecord.userId,
    });
  }

  async getMe(userId: string): Promise<AuthMeDto> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "User account not found.");
    }
    const workspaces = await this.repo.listUserWorkspaces(user.id);
    return {
      user: toUserDto(user),
      workspaces: workspaces.map(toWorkspaceDto),
    };
  }

  async listSessions(userId: string, currentSessionId: string): Promise<SessionDto[]> {
    const sessions = await this.repo.listActiveSessions(userId);
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      current: s.id === currentSessionId,
    }));
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const revoked = await this.repo.revokeSession(sessionId, userId);
    if (!revoked) {
      throw new AppError(404, "SESSION_NOT_FOUND", "Active session not found.");
    }
    await this.repo.writeAuditLog({
      actorId: userId,
      action: "auth.session_revoked",
      resourceType: "session",
      resourceId: sessionId,
    });
  }

  private async issueSessionTokens(
    user: UserRecord,
    meta: { userAgent: string | null; ipAddress: string | null },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = generateOpaqueToken(32);
    const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
    const session = await this.repo.createSession({
      userId: user.id,
      refreshTokenHash: hashOpaqueToken(refreshToken),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    });

    const accessToken = signAccessToken({
      sub: user.id,
      sid: session.id,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
    });

    return { accessToken, refreshToken };
  }
}
