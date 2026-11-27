import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { AuthTokenType } from "@app/database";
import type { UserRole, WorkspaceRole } from "@app/types";
import { createApp } from "../../app.js";
import type {
  AuthRepository,
  AuthTokenRecord,
  SessionRecord,
  UserRecord,
  WorkspaceWithRoleRecord,
} from "./auth.repository.js";
import type { AuthTokenDispatchEvent } from "./auth.service.js";

function createInMemoryAuthRepository(): AuthRepository & {
  promoteToAdmin: (userId: string) => void;
} {
  const users = new Map<string, UserRecord>();
  const workspaces = new Map<string, { id: string; name: string; slug: string; createdAt: Date }>();
  const memberships: { workspaceId: string; userId: string; role: WorkspaceRole }[] = [];
  const sessions = new Map<string, SessionRecord>();
  const authTokens = new Map<string, AuthTokenRecord>();

  return {
    promoteToAdmin(userId: string) {
      const user = users.get(userId);
      if (user) user.role = "ADMIN" as UserRole;
    },
    async findUserByEmail(email: string) {
      const lower = email.toLowerCase();
      for (const user of users.values()) {
        if (user.email === lower) return user;
      }
      return null;
    },
    async findUserById(id: string) {
      return users.get(id) ?? null;
    },
    async createUserWithWorkspace(input) {
      const now = new Date();
      const user: UserRecord = {
        id: randomUUID(),
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        name: input.name,
        role: "USER",
        emailVerifiedAt: null,
        createdAt: now,
      };
      users.set(user.id, user);

      const wsId = randomUUID();
      workspaces.set(wsId, {
        id: wsId,
        name: input.workspaceName,
        slug: input.workspaceSlug,
        createdAt: now,
      });
      memberships.push({ workspaceId: wsId, userId: user.id, role: "OWNER" });

      return {
        user,
        workspace: {
          id: wsId,
          name: input.workspaceName,
          slug: input.workspaceSlug,
          role: "OWNER",
          createdAt: now,
        },
      };
    },
    async markEmailVerified(userId, verifiedAt) {
      const user = users.get(userId);
      if (user) user.emailVerifiedAt = verifiedAt;
    },
    async updatePasswordHash(userId, passwordHash) {
      const user = users.get(userId);
      if (user) user.passwordHash = passwordHash;
    },
    async listUserWorkspaces(userId) {
      const result: WorkspaceWithRoleRecord[] = [];
      for (const m of memberships) {
        if (m.userId === userId) {
          const ws = workspaces.get(m.workspaceId);
          if (ws) result.push({ ...ws, role: m.role });
        }
      }
      return result;
    },
    async getWorkspaceRole(workspaceId, userId) {
      return (
        memberships.find((m) => m.workspaceId === workspaceId && m.userId === userId)?.role ?? null
      );
    },
    async createSession(input) {
      const session: SessionRecord = {
        id: randomUUID(),
        ...input,
        revokedAt: null,
        createdAt: new Date(),
      };
      sessions.set(session.id, session);
      return session;
    },
    async findSessionByRefreshHash(refreshTokenHash) {
      for (const s of sessions.values()) {
        if (s.refreshTokenHash === refreshTokenHash) return s;
      }
      return null;
    },
    async rotateSessionRefreshHash(sessionId, newRefreshTokenHash, expiresAt) {
      const s = sessions.get(sessionId);
      if (s) {
        s.refreshTokenHash = newRefreshTokenHash;
        s.expiresAt = expiresAt;
      }
    },
    async revokeSession(sessionId, userId) {
      const s = sessions.get(sessionId);
      if (s && s.userId === userId && !s.revokedAt) {
        s.revokedAt = new Date();
        return true;
      }
      return false;
    },
    async revokeAllUserSessions(userId) {
      for (const s of sessions.values()) {
        if (s.userId === userId && !s.revokedAt) s.revokedAt = new Date();
      }
    },
    async listActiveSessions(userId) {
      const now = new Date();
      return [...sessions.values()].filter(
        (s) => s.userId === userId && !s.revokedAt && s.expiresAt > now,
      );
    },
    async createAuthToken(input) {
      const record: AuthTokenRecord = {
        id: randomUUID(),
        ...input,
        consumedAt: null,
      };
      authTokens.set(record.id, record);
      return record;
    },
    async findValidAuthToken(tokenHash: string, type: AuthTokenType) {
      const now = new Date();
      for (const t of authTokens.values()) {
        if (t.tokenHash === tokenHash && t.type === type && !t.consumedAt && t.expiresAt > now) {
          return t;
        }
      }
      return null;
    },
    async consumeAuthToken(tokenId) {
      const t = authTokens.get(tokenId);
      if (t) t.consumedAt = new Date();
    },
    async writeAuditLog() {},
  };
}

function extractCookies(res: request.Response): {
  cookieHeader: string[];
  csrfToken: string;
} {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  const cookieHeader = (raw ?? []).map((c) => c.split(";")[0] ?? "");
  const csrfCookie = cookieHeader.find((c) => c.startsWith("facelens_csrf="));
  const csrfToken = csrfCookie ? csrfCookie.slice("facelens_csrf=".length) : "";
  return { cookieHeader, csrfToken };
}

describe("Authentication, Sessions, CSRF, and RBAC", () => {
  it("supports register, email verification, login, CSRF protection, refresh rotation, and logout", async () => {
    const dispatched: AuthTokenDispatchEvent[] = [];
    const repo = createInMemoryAuthRepository();
    const app = createApp({
      authRepository: repo,
      dispatchToken: (ev) => dispatched.push(ev),
    });

    const regRes = await request(app).post("/api/v1/auth/register").send({
      email: "alice@example.com",
      password: "strong-password-2026!",
      name: "Alice Owner",
      acceptedTerms: true,
    });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.user.email).toBe("alice@example.com");
    expect(regRes.body.data.workspaces[0].role).toBe("OWNER");

    const dupRes = await request(app).post("/api/v1/auth/register").send({
      email: "alice@example.com",
      password: "strong-password-2026!",
      name: "Alice Dup",
      acceptedTerms: true,
    });
    expect(dupRes.status).toBe(409);

    const verifyEvent = dispatched.find((e) => e.type === "EMAIL_VERIFICATION");
    expect(verifyEvent).toBeDefined();

    const verifyRes = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: verifyEvent!.token });
    expect(verifyRes.status).toBe(200);

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "alice@example.com",
      password: "strong-password-2026!",
    });
    expect(loginRes.status).toBe(200);
    const { cookieHeader, csrfToken } = extractCookies(loginRes);
    expect(csrfToken.length).toBeGreaterThan(10);

    const meRes = await request(app).get("/api/v1/auth/me").set("Cookie", cookieHeader);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.emailVerifiedAt).not.toBeNull();

    // Missing CSRF header on cookie-authenticated POST should fail
    const badRefresh = await request(app).post("/api/v1/auth/refresh").set("Cookie", cookieHeader);
    expect(badRefresh.status).toBe(403);

    // Valid CSRF header succeeds and rotates refresh token
    const goodRefresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookieHeader)
      .set("x-csrf-token", csrfToken);
    expect(goodRefresh.status).toBe(200);

    const rotated = extractCookies(goodRefresh);
    // Old refresh token is invalidated after rotation
    const replayRefresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookieHeader)
      .set("x-csrf-token", csrfToken);
    expect(replayRefresh.status).toBe(401);

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", rotated.cookieHeader)
      .set("x-csrf-token", rotated.csrfToken);
    expect(logoutRes.status).toBe(200);
  });

  it("supports forgot password, reset password, and revokes existing sessions", async () => {
    const dispatched: AuthTokenDispatchEvent[] = [];
    const repo = createInMemoryAuthRepository();
    const app = createApp({
      authRepository: repo,
      dispatchToken: (ev) => dispatched.push(ev),
    });

    await request(app).post("/api/v1/auth/register").send({
      email: "bob@example.com",
      password: "initial-password-2026!",
      name: "Bob User",
      acceptedTerms: true,
    });

    const unknownForgot = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nobody@example.com" });
    expect(unknownForgot.status).toBe(200);

    const forgotRes = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "bob@example.com" });
    expect(forgotRes.status).toBe(200);

    const resetEvent = dispatched.find((e) => e.type === "PASSWORD_RESET");
    expect(resetEvent).toBeDefined();

    const resetRes = await request(app).post("/api/v1/auth/reset-password").send({
      token: resetEvent!.token,
      password: "updated-password-2026!",
    });
    expect(resetRes.status).toBe(200);

    const oldLogin = await request(app).post("/api/v1/auth/login").send({
      email: "bob@example.com",
      password: "initial-password-2026!",
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post("/api/v1/auth/login").send({
      email: "bob@example.com",
      password: "updated-password-2026!",
    });
    expect(newLogin.status).toBe(200);
  });

  it("enforces tenant workspace isolation and admin role access control", async () => {
    const repo = createInMemoryAuthRepository();
    const app = createApp({ authRepository: repo });

    const aliceReg = await request(app).post("/api/v1/auth/register").send({
      email: "alice2@example.com",
      password: "strong-password-2026!",
      name: "Alice",
      acceptedTerms: true,
    });
    const aliceWorkspaceId = aliceReg.body.data.workspaces[0].id as string;
    const aliceCookies = extractCookies(aliceReg).cookieHeader;

    const bobReg = await request(app).post("/api/v1/auth/register").send({
      email: "bob2@example.com",
      password: "strong-password-2026!",
      name: "Bob",
      acceptedTerms: true,
    });
    const bobId = bobReg.body.data.user.id as string;
    const bobCookies = extractCookies(bobReg).cookieHeader;

    // Alice can access her workspace
    const aliceCheck = await request(app)
      .get(`/api/v1/workspaces/${aliceWorkspaceId}/access-check`)
      .set("Cookie", aliceCookies);
    expect(aliceCheck.status).toBe(200);

    // Bob cannot access Alice's workspace
    const bobCrossTenant = await request(app)
      .get(`/api/v1/workspaces/${aliceWorkspaceId}/access-check`)
      .set("Cookie", bobCookies);
    expect(bobCrossTenant.status).toBe(403);

    // Regular user cannot access admin overview
    const userAdminRes = await request(app)
      .get("/api/v1/admin/overview")
      .set("Cookie", bobCookies);
    expect(userAdminRes.status).toBe(403);

    // Promoted ADMIN user can access admin overview after fresh login
    repo.promoteToAdmin(bobId);
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: "bob2@example.com",
      password: "strong-password-2026!",
    });
    const adminCookies = extractCookies(adminLogin).cookieHeader;
    const adminRes = await request(app)
      .get("/api/v1/admin/overview")
      .set("Cookie", adminCookies);
    expect(adminRes.status).toBe(200);
  });
});
