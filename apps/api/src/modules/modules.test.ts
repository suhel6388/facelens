import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { AuthTokenType } from "@app/database";
import type {
  AdminOverviewDto,
  AuditLogDto,
  BillingOverviewDto,
  CollectionDto,
  CollectionImageDto,
  ConsentRecordDto,
  PaymentDto,
  SearchDto,
  SubscriptionDto,
  UploadTicketDto,
  UserDto,
  UserRole,
  WorkspaceDetailDto,
  WorkspaceDto,
  WorkspaceMemberDto,
  WorkspaceRole,
} from "@app/types";
import { createApp } from "../app.js";
import type { AdminRepository, AdminWorkspaceSummaryDto } from "./admin/admin.repository.js";
import type {
  AuthRepository,
  AuthTokenRecord,
  SessionRecord,
  UserRecord,
  WorkspaceWithRoleRecord,
} from "./auth/auth.repository.js";
import type { BillingRepository } from "./billing/billing.repository.js";
import type { CollectionsRepository } from "./collections/collections.repository.js";
import type { ConsentRepository } from "./consent/consent.repository.js";
import {
  SIMILARITY_DISCLAIMER,
  type SearchesRepository,
  type SearchWithResultsDto,
} from "./searches/searches.repository.js";
import type { UploadsRepository } from "./uploads/uploads.repository.js";
import type { UsersRepository } from "./users/users.repository.js";
import type { WorkspacesRepository } from "./workspaces/workspaces.repository.js";

function extractCookies(res: request.Response): Record<string, string> {
  const header = res.headers["set-cookie"];
  const map: Record<string, string> = {};
  if (!Array.isArray(header)) return map;
  for (const item of header) {
    const [pair] = item.split(";");
    if (!pair) continue;
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    map[pair.slice(0, idx)] = decodeURIComponent(pair.slice(idx + 1));
  }
  return map;
}

function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("; ");
}

function createInMemoryPlatform() {
  const users = new Map<string, UserRecord>();
  const workspaces = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      retentionDays: number;
      createdAt: Date;
      updatedAt: Date;
    }
  >();
  const memberships: {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    createdAt: Date;
  }[] = [];
  const sessions = new Map<string, SessionRecord>();
  const authTokens = new Map<string, AuthTokenRecord>();
  const collections = new Map<string, CollectionDto>();
  const images = new Map<string, CollectionImageDto & { deleted: boolean; storageKey: string }>();
  const objectStore = new Map<string, Buffer>();
  const consents = new Map<string, ConsentRecordDto>();
  const searches = new Map<string, SearchDto & { deleted: boolean }>();
  const subscriptions = new Map<string, SubscriptionDto>();
  const payments = new Map<string, PaymentDto>();
  const auditLogs: AuditLogDto[] = [];

  const authRepository: AuthRepository = {
    async findUserByEmail(email) {
      const lower = email.toLowerCase();
      for (const u of users.values()) if (u.email === lower) return u;
      return null;
    },
    async findUserById(id) {
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
        retentionDays: 30,
        createdAt: now,
        updatedAt: now,
      });
      memberships.push({
        id: randomUUID(),
        workspaceId: wsId,
        userId: user.id,
        role: "OWNER",
        createdAt: now,
      });
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
      const u = users.get(userId);
      if (u) u.emailVerifiedAt = verifiedAt;
    },
    async updatePasswordHash(userId, passwordHash) {
      const u = users.get(userId);
      if (u) u.passwordHash = passwordHash;
    },
    async listUserWorkspaces(userId) {
      const result: WorkspaceWithRoleRecord[] = [];
      for (const m of memberships) {
        if (m.userId === userId) {
          const ws = workspaces.get(m.workspaceId);
          if (ws)
            result.push({
              id: ws.id,
              name: ws.name,
              slug: ws.slug,
              role: m.role,
              createdAt: ws.createdAt,
            });
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
      const s: SessionRecord = {
        id: randomUUID(),
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: input.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      };
      sessions.set(s.id, s);
      return s;
    },
    async findSessionByRefreshHash(hash) {
      for (const s of sessions.values()) if (s.refreshTokenHash === hash) return s;
      return null;
    },
    async rotateSessionRefreshHash(sessionId, newHash, expiresAt) {
      const s = sessions.get(sessionId);
      if (s) {
        s.refreshTokenHash = newHash;
        s.expiresAt = expiresAt;
      }
    },
    async revokeSession(sessionId, userId) {
      const s = sessions.get(sessionId);
      if (s && s.userId === userId) {
        s.revokedAt = new Date();
        return true;
      }
      return false;
    },
    async revokeAllUserSessions(userId: string) {
      for (const s of sessions.values()) if (s.userId === userId) s.revokedAt = new Date();
    },
    async listActiveSessions(userId: string) {
      return Array.from(sessions.values()).filter((s) => s.userId === userId && !s.revokedAt);
    },
    async createAuthToken(input) {
      const t: AuthTokenRecord = {
        id: randomUUID(),
        userId: input.userId,
        type: input.type as AuthTokenType,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        consumedAt: null,
      };
      authTokens.set(t.id, t);
      return t;
    },
    async findValidAuthToken(tokenHash, type) {
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
    async writeAuditLog(input) {
      auditLogs.push({
        id: randomUUID(),
        workspaceId: input.workspaceId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        createdAt: new Date().toISOString(),
      });
    },
  };

  const usersRepository: UsersRepository = {
    async findById(userId) {
      const u = users.get(userId);
      if (!u) return null;
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        emailVerifiedAt: u.emailVerifiedAt ? u.emailVerifiedAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
      };
    },
    async updateName(userId, name) {
      const u = users.get(userId);
      if (!u) return null;
      u.name = name;
      return this.findById(userId);
    },
    async deleteUser(userId) {
      return users.delete(userId);
    },
  };

  const workspacesRepository: WorkspacesRepository = {
    async listForUser(userId): Promise<WorkspaceDto[]> {
      return memberships
        .filter((m) => m.userId === userId)
        .map((m) => {
          const ws = workspaces.get(m.workspaceId)!;
          return {
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            role: m.role,
            createdAt: ws.createdAt.toISOString(),
          };
        });
    },
    async createWorkspace(params): Promise<WorkspaceDto> {
      const now = new Date();
      const id = randomUUID();
      workspaces.set(id, {
        id,
        name: params.name,
        slug: params.slug,
        retentionDays: 30,
        createdAt: now,
        updatedAt: now,
      });
      memberships.push({
        id: randomUUID(),
        workspaceId: id,
        userId: params.userId,
        role: "OWNER",
        createdAt: now,
      });
      return {
        id,
        name: params.name,
        slug: params.slug,
        role: "OWNER",
        createdAt: now.toISOString(),
      };
    },
    async findDetail(workspaceId, userId): Promise<WorkspaceDetailDto | null> {
      const m = memberships.find((x) => x.workspaceId === workspaceId && x.userId === userId);
      const ws = workspaces.get(workspaceId);
      if (!m || !ws) return null;
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        retentionDays: ws.retentionDays,
        role: m.role,
        memberCount: memberships.filter((x) => x.workspaceId === workspaceId).length,
        collectionCount: Array.from(collections.values()).filter(
          (c) => c.workspaceId === workspaceId && c.status !== "DELETED",
        ).length,
        createdAt: ws.createdAt.toISOString(),
        updatedAt: ws.updatedAt.toISOString(),
      };
    },
    async updateWorkspace(workspaceId, data): Promise<WorkspaceDetailDto | null> {
      const ws = workspaces.get(workspaceId);
      if (!ws) return null;
      if (data.name !== undefined) ws.name = data.name;
      if (data.retentionDays !== undefined) ws.retentionDays = data.retentionDays;
      ws.updatedAt = new Date();
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        retentionDays: ws.retentionDays,
        role: "OWNER",
        memberCount: memberships.filter((x) => x.workspaceId === workspaceId).length,
        collectionCount: 0,
        createdAt: ws.createdAt.toISOString(),
        updatedAt: ws.updatedAt.toISOString(),
      };
    },
    async listMembers(workspaceId): Promise<WorkspaceMemberDto[]> {
      return memberships
        .filter((m) => m.workspaceId === workspaceId)
        .map((m) => {
          const u = users.get(m.userId)!;
          return {
            id: m.id,
            workspaceId,
            userId: m.userId,
            email: u.email,
            name: u.name,
            role: m.role,
            createdAt: m.createdAt.toISOString(),
          };
        });
    },
    async findUserByEmail(email) {
      for (const u of users.values())
        if (u.email === email.toLowerCase()) return { id: u.id, email: u.email, name: u.name };
      return null;
    },
    async findMemberByUser(workspaceId, userId) {
      const m = memberships.find((x) => x.workspaceId === workspaceId && x.userId === userId);
      if (!m) return null;
      const u = users.get(userId)!;
      return {
        id: m.id,
        workspaceId,
        userId,
        email: u.email,
        name: u.name,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
      };
    },
    async addMember(workspaceId, userId, role) {
      const m = { id: randomUUID(), workspaceId, userId, role, createdAt: new Date() };
      memberships.push(m);
      const u = users.get(userId)!;
      return {
        id: m.id,
        workspaceId,
        userId,
        email: u.email,
        name: u.name,
        role,
        createdAt: m.createdAt.toISOString(),
      };
    },
    async updateMemberRole(workspaceId, memberId, role) {
      const m = memberships.find((x) => x.workspaceId === workspaceId && x.id === memberId);
      if (!m) return null;
      m.role = role;
      const u = users.get(m.userId)!;
      return {
        id: m.id,
        workspaceId,
        userId: m.userId,
        email: u.email,
        name: u.name,
        role,
        createdAt: m.createdAt.toISOString(),
      };
    },
    async removeMember(workspaceId, memberId) {
      const idx = memberships.findIndex((x) => x.workspaceId === workspaceId && x.id === memberId);
      if (idx === -1) return false;
      memberships.splice(idx, 1);
      return true;
    },
  };

  const collectionsRepository: CollectionsRepository = {
    async list(workspaceId) {
      return Array.from(collections.values()).filter(
        (c) => c.workspaceId === workspaceId && c.status !== "DELETED",
      );
    },
    async findById(workspaceId, collectionId) {
      const c = collections.get(collectionId);
      return c && c.workspaceId === workspaceId && c.status !== "DELETED" ? c : null;
    },
    async create(params) {
      const now = new Date().toISOString();
      const dto: CollectionDto = {
        id: randomUUID(),
        workspaceId: params.workspaceId,
        name: params.name,
        description: params.description ?? null,
        purpose: params.purpose,
        status: "ACTIVE",
        imageCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      collections.set(dto.id, dto);
      auditLogs.push({
        id: randomUUID(),
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        action: "COLLECTION_CREATED",
        resourceType: "Collection",
        resourceId: dto.id,
        createdAt: now,
      });
      return dto;
    },
    async update(workspaceId, collectionId, data) {
      const c = collections.get(collectionId);
      if (!c || c.workspaceId !== workspaceId || c.status === "DELETED") return null;
      Object.assign(c, data, { updatedAt: new Date().toISOString() });
      return c;
    },
    async softDelete(workspaceId, collectionId) {
      const c = collections.get(collectionId);
      if (!c || c.workspaceId !== workspaceId || c.status === "DELETED") return false;
      c.status = "DELETED";
      return true;
    },
  };

  const uploadsRepository: UploadsRepository = {
    async collectionExists(workspaceId, collectionId) {
      const c = collections.get(collectionId);
      return Boolean(c && c.workspaceId === workspaceId && c.status === "ACTIVE");
    },
    async createEnrollment(params): Promise<UploadTicketDto> {
      const now = new Date().toISOString();
      const imageId = params.imageId;
      const consentId = randomUUID();
      images.set(imageId, {
        id: imageId,
        collectionId: params.collectionId,
        workspaceId: params.workspaceId,
        mimeType: params.mimeType,
        width: params.width,
        height: params.height,
        sizeBytes: params.sizeBytes,
        consentStatus: "GRANTED",
        enrolledAt: now,
        storageKey: params.storageKey,
        deleted: false,
      });
      consents.set(consentId, {
        id: consentId,
        workspaceId: params.workspaceId,
        collectionImageId: imageId,
        authorizationBasis: params.authorizationBasis,
        grantedByUserId: params.actorId,
        status: "GRANTED",
        withdrawnAt: null,
        withdrawalReason: null,
        createdAt: now,
        updatedAt: now,
      });
      return {
        imageId,
        collectionId: params.collectionId,
        workspaceId: params.workspaceId,
        storageKey: params.storageKey,
        uploadUrl: params.uploadUrl,
        expiresAt: params.expiresAt.toISOString(),
        consentRecordId: consentId,
      };
    },
    async findImageById(workspaceId, imageId) {
      const img = images.get(imageId);
      if (!img || img.workspaceId !== workspaceId || img.deleted) return null;
      return {
        id: img.id,
        workspaceId: img.workspaceId,
        collectionId: img.collectionId,
        storageKey: img.storageKey,
        mimeType: img.mimeType,
        sizeBytes: img.sizeBytes,
        width: img.width,
        height: img.height,
      };
    },
    async updateImageMetadata(workspaceId, imageId, data) {
      const img = images.get(imageId);
      if (img && img.workspaceId === workspaceId && !img.deleted) {
        img.sizeBytes = data.sizeBytes;
        img.width = data.width;
        img.height = data.height;
      }
    },
    async listCollectionImages(workspaceId, collectionId) {
      return Array.from(images.values()).filter(
        (i) => i.workspaceId === workspaceId && i.collectionId === collectionId && !i.deleted,
      );
    },
    async softDeleteImage(workspaceId, imageId) {
      const img = images.get(imageId);
      if (!img || img.workspaceId !== workspaceId || img.deleted) return null;
      img.deleted = true;
      return img.storageKey;
    },
  };

  const consentRepository: ConsentRepository = {
    async listByWorkspace(workspaceId) {
      return Array.from(consents.values()).filter((c) => c.workspaceId === workspaceId);
    },
    async listByCollection(workspaceId, collectionId) {
      const colImageIds = new Set(
        Array.from(images.values())
          .filter(
            (i) => i.workspaceId === workspaceId && i.collectionId === collectionId && !i.deleted,
          )
          .map((i) => i.id),
      );
      return Array.from(consents.values()).filter(
        (c) => c.workspaceId === workspaceId && colImageIds.has(c.collectionImageId),
      );
    },
    async listByImage(workspaceId, imageId) {
      return Array.from(consents.values()).filter(
        (c) => c.workspaceId === workspaceId && c.collectionImageId === imageId,
      );
    },
    async withdrawConsent(params) {
      const img = images.get(params.imageId);
      if (!img || img.workspaceId !== params.workspaceId || img.deleted) return null;
      const rec = Array.from(consents.values()).find(
        (c) => c.workspaceId === params.workspaceId && c.collectionImageId === params.imageId,
      );
      if (!rec) return null;
      img.consentStatus = "WITHDRAWN";
      rec.status = "WITHDRAWN";
      rec.withdrawnAt = new Date().toISOString();
      rec.withdrawalReason = params.reason;
      return rec;
    },
  };

  const searchesRepository: SearchesRepository = {
    async list(workspaceId, pagination) {
      const all = Array.from(searches.values()).filter(
        (s) => s.workspaceId === workspaceId && !s.deleted,
      );
      return {
        items: all.slice(
          (pagination.page - 1) * pagination.limit,
          pagination.page * pagination.limit,
        ),
        total: all.length,
      };
    },
    async getWorkspaceRetentionAndCollection(workspaceId, collectionId) {
      const ws = workspaces.get(workspaceId);
      if (!ws) return null;
      const col = collections.get(collectionId);
      return {
        retentionDays: ws.retentionDays,
        collectionActive: Boolean(
          col && col.workspaceId === workspaceId && col.status === "ACTIVE",
        ),
      };
    },
    async createSearch(params) {
      const now = new Date().toISOString();
      const s: SearchDto & { deleted: boolean } = {
        id: randomUUID(),
        workspaceId: params.workspaceId,
        collectionId: params.collectionId,
        status: "QUEUED",
        resultCount: 0,
        retentionExpiresAt: params.retentionExpiresAt.toISOString(),
        createdAt: now,
        completedAt: null,
        deleted: false,
      };
      searches.set(s.id, s);
      return s;
    },
    async findByIdWithResults(workspaceId, searchId): Promise<SearchWithResultsDto | null> {
      const s = searches.get(searchId);
      if (!s || s.workspaceId !== workspaceId || s.deleted) return null;
      return {
        search: s,
        results: [
          {
            id: randomUUID(),
            searchId: s.id,
            collectionImageId: randomUUID(),
            similarityEstimate: 0.91,
            rank: 1,
            disclaimer: SIMILARITY_DISCLAIMER,
          },
        ],
      };
    },
    async cancelSearch(workspaceId, searchId) {
      const s = searches.get(searchId);
      if (!s || s.workspaceId !== workspaceId || s.deleted) return null;
      s.status = "CANCELLED";
      return s;
    },
    async softDeleteSearch(workspaceId, searchId) {
      const s = searches.get(searchId);
      if (!s || s.workspaceId !== workspaceId || s.deleted) return false;
      s.deleted = true;
      return true;
    },
  };

  const billingRepository: BillingRepository = {
    async getOverview(workspaceId): Promise<BillingOverviewDto> {
      const sub =
        Array.from(subscriptions.values()).find(
          (s) => s.workspaceId === workspaceId && s.status === "ACTIVE",
        ) ?? null;
      const recentPayments = Array.from(payments.values()).filter(
        (p) => p.workspaceId === workspaceId,
      );
      return { subscription: sub, monthlySearchesUsed: 0, recentPayments };
    },
    async upsertSubscription(params) {
      const now = new Date();
      const sub: SubscriptionDto = {
        id: randomUUID(),
        workspaceId: params.workspaceId,
        planCode: params.planCode,
        status: "ACTIVE",
        monthlySearchLimit: params.monthlySearchLimit,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: new Date(now.getTime() + 30 * 86400_000).toISOString(),
        createdAt: now.toISOString(),
      };
      subscriptions.set(sub.id, sub);
      return sub;
    },
    async createPendingPayment(params) {
      const p: PaymentDto = {
        id: randomUUID(),
        workspaceId: params.workspaceId,
        amountCents: params.amountCents,
        currency: params.currency,
        status: "PENDING",
        externalRef: params.externalRef,
        createdAt: new Date().toISOString(),
      };
      payments.set(p.id, p);
      return p;
    },
    async listPayments(workspaceId) {
      return Array.from(payments.values()).filter((p) => p.workspaceId === workspaceId);
    },
  };

  const adminRepository: AdminRepository = {
    async getOverview(): Promise<AdminOverviewDto> {
      return {
        totalUsers: users.size,
        totalWorkspaces: workspaces.size,
        totalCollections: collections.size,
        totalSearches: searches.size,
      };
    },
    async listUsers(pagination): Promise<{ items: UserDto[]; total: number }> {
      const all: UserDto[] = Array.from(users.values()).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        emailVerifiedAt: u.emailVerifiedAt ? u.emailVerifiedAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
      }));
      return {
        items: all.slice(
          (pagination.page - 1) * pagination.limit,
          pagination.page * pagination.limit,
        ),
        total: all.length,
      };
    },
    async listWorkspaces(
      pagination,
    ): Promise<{ items: AdminWorkspaceSummaryDto[]; total: number }> {
      const all: AdminWorkspaceSummaryDto[] = Array.from(workspaces.values()).map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        retentionDays: w.retentionDays,
        memberCount: memberships.filter((m) => m.workspaceId === w.id).length,
        collectionCount: 0,
        createdAt: w.createdAt.toISOString(),
      }));
      return {
        items: all.slice(
          (pagination.page - 1) * pagination.limit,
          pagination.page * pagination.limit,
        ),
        total: all.length,
      };
    },
    async listAuditLogs(query) {
      const filtered = auditLogs.filter(
        (l) => !query.workspaceId || l.workspaceId === query.workspaceId,
      );
      return {
        items: filtered.slice((query.page - 1) * query.limit, query.page * query.limit),
        total: filtered.length,
      };
    },
  };

  return {
    app: createApp({
      authRepository,
      usersRepository,
      workspacesRepository,
      collectionsRepository,
      consentRepository,
      uploadsRepository,
      storageAdapter: {
        createSignedUploadUrl({ workspaceId, imageId, expiresAt }) {
          return `/api/v1/workspaces/${workspaceId}/uploads/direct/${imageId}?expires=${expiresAt.getTime()}&sig=valid-test-sig`;
        },
        verifyUploadSignature({ expires, signature }) {
          return signature === "valid-test-sig" && Date.now() <= expires;
        },
        async putObject(storageKey, data) {
          objectStore.set(storageKey, data);
        },
        async getObject(storageKey) {
          return objectStore.get(storageKey) ?? null;
        },
        async deleteObject(storageKey) {
          objectStore.delete(storageKey);
        },
      },
      searchesRepository,
      billingRepository,
      adminRepository,
    }),
    promoteToAdmin(userId: string) {
      const u = users.get(userId);
      if (u) u.role = "ADMIN" as UserRole;
    },
  };
}

describe("Phase 5 Core API Modules & OpenAPI", () => {
  it("serves OpenAPI JSON specification and Swagger UI", async () => {
    const { app } = createInMemoryPlatform();
    const specRes = await request(app).get("/api/openapi.json");
    expect(specRes.status).toBe(200);
    expect(specRes.body.openapi).toBe("3.0.3");
    expect(specRes.body.paths["/workspaces/{workspaceId}/collections"]).toBeDefined();

    const docsRes = await request(app).get("/api/docs/");
    expect(docsRes.status).toBe(200);
    expect(docsRes.text).toContain("Swagger UI");
  });

  it("supports end-to-end Users, Workspaces, Collections, Uploads, Consent, Searches, Billing, and Admin flows", async () => {
    const { app, promoteToAdmin } = createInMemoryPlatform();

    // Register user
    const regRes = await request(app).post("/api/v1/auth/register").send({
      email: "owner@facelens.dev",
      password: "StrongPassword123!",
      name: "Workspace Owner",
      acceptedTerms: true,
    });
    expect(regRes.status).toBe(201);
    const cookies = extractCookies(regRes);
    const csrf = cookies.facelens_csrf!;
    const userId = regRes.body.data.user.id as string;
    const workspaceId = regRes.body.data.workspaces[0].id as string;

    // Users: GET + PATCH /users/me
    const profileRes = await request(app)
      .get("/api/v1/users/me")
      .set("Cookie", cookieHeader(cookies));
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.email).toBe("owner@facelens.dev");

    const updateProfileRes = await request(app)
      .patch("/api/v1/users/me")
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", csrf)
      .send({ name: "Updated Owner" });
    expect(updateProfileRes.status).toBe(200);
    expect(updateProfileRes.body.data.name).toBe("Updated Owner");

    // Workspaces: create second workspace + get detail + update retentionDays
    const createWsRes = await request(app)
      .post("/api/v1/workspaces")
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", csrf)
      .send({ name: "Compliance Team" });
    expect(createWsRes.status).toBe(201);

    const patchWsRes = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}`)
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", csrf)
      .send({ retentionDays: 14 });
    expect(patchWsRes.status).toBe(200);
    expect(patchWsRes.body.data.retentionDays).toBe(14);

    // Collections: validation rejects missing authorityConfirmed
    const badColRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/collections`)
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", csrf)
      .send({ name: "Test", purpose: "Authorized security review" });
    expect(badColRes.status).toBe(400);
    expect(badColRes.body.error.code).toBe("VALIDATION_ERROR");

    // Collections: create valid collection
    const colRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/collections`)
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", csrf)
      .send({
        name: "Authorized Staff Directory",
        purpose: "Internal badge verification for facility access.",
        authorityConfirmed: true,
      });
    expect(colRes.status).toBe(201);
    const collectionId = colRes.body.data.id as string;

    // Uploads: create upload ticket + list images
    const ticketRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/uploads/ticket`)
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", csrf)
      .send({
        collectionId,
        mimeType: "image/jpeg",
        sizeBytes: 204800,
        width: 800,
        height: 800,
        sha256: "a".repeat(64),
        authorizationBasis: "Signed employee badge consent form #2026-01",
        consentConfirmed: true,
        subjectAdultConfirmed: true,
      });
    expect(ticketRes.status).toBe(201);
    const imageId = ticketRes.body.data.imageId as string;

    const listImagesRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/uploads/collections/${collectionId}/images`)
      .set("Cookie", cookieHeader(cookies));
    expect(listImagesRes.status).toBe(200);
    expect(listImagesRes.body.data).toHaveLength(1);

    // Consent: list + withdraw consent
    const consentRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/consent/images/${imageId}/withdraw`)
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", csrf)
      .send({ reason: "Subject requested removal from directory." });
    expect(consentRes.status).toBe(200);
    expect(consentRes.body.data.status).toBe("WITHDRAWN");

    // Searches: create + get with disclaimer + cancel
    const searchRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/searches`)
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", csrf)
      .send({ collectionId, purposeConfirmed: true });
    expect(searchRes.status).toBe(201);
    const searchId = searchRes.body.data.id as string;

    const getSearchRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/searches/${searchId}`)
      .set("Cookie", cookieHeader(cookies));
    expect(getSearchRes.status).toBe(200);
    expect(getSearchRes.body.data.results[0].disclaimer).toContain(
      "do not constitute positive identification",
    );

    const cancelSearchRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/searches/${searchId}/cancel`)
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", csrf);
    expect(cancelSearchRes.status).toBe(200);
    expect(cancelSearchRes.body.data.status).toBe("CANCELLED");

    // Billing: update subscription + checkout + overview
    const subRes = await request(app)
      .put(`/api/v1/workspaces/${workspaceId}/billing/subscription`)
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", csrf)
      .send({ planCode: "PRO" });
    expect(subRes.status).toBe(200);
    expect(subRes.body.data.monthlySearchLimit).toBe(2000);

    const checkoutRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/billing/checkout`)
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", csrf)
      .send({ planCode: "PRO", currency: "USD" });
    expect(checkoutRes.status).toBe(201);

    const billingOverviewRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/billing`)
      .set("Cookie", cookieHeader(cookies));
    expect(billingOverviewRes.status).toBe(200);
    expect(billingOverviewRes.body.data.subscription.planCode).toBe("PRO");
    expect(billingOverviewRes.body.data.recentPayments).toHaveLength(1);

    // Admin: denied for USER role
    const adminDenied = await request(app)
      .get("/api/v1/admin/overview")
      .set("Cookie", cookieHeader(cookies));
    expect(adminDenied.status).toBe(403);

    // Promote user to ADMIN and re-login to get ADMIN JWT
    promoteToAdmin(userId);
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: "owner@facelens.dev",
      password: "StrongPassword123!",
    });
    const adminCookies = extractCookies(adminLogin);

    const adminOverview = await request(app)
      .get("/api/v1/admin/overview")
      .set("Cookie", cookieHeader(adminCookies));
    expect(adminOverview.status).toBe(200);
    expect(adminOverview.body.data.totalUsers).toBe(1);

    const adminAudit = await request(app)
      .get("/api/v1/admin/audit-logs")
      .set("Cookie", cookieHeader(adminCookies));
    expect(adminAudit.status).toBe(200);
    expect(adminAudit.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
