export const BRAND_NAME = "FaceLens" as const;
export const BRAND_TAGLINE = "Authorized Private Collection Similarity Search" as const;

export type UserRole = "USER" | "ADMIN";
export type WorkspaceRole = "OWNER" | "MEMBER" | "VIEWER";

export type CollectionStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

export type ConsentStatus = "GRANTED" | "WITHDRAWN" | "PENDING_DELETION" | "DELETED";

export type SearchStatus =
  "QUEUED" | "VALIDATING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "DELETED";

export type DeletionRequestStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface ApiMeta {
  requestId: string;
  timestamp?: string;
}

export interface PaginationMeta extends ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T, M extends ApiMeta = ApiMeta> {
  data: T;
  meta: M;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  meta: ApiMeta;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  createdAt: string;
}

export interface CollectionDto {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  purpose: string;
  status: CollectionStatus;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionImageDto {
  id: string;
  collectionId: string;
  workspaceId: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  consentStatus: ConsentStatus;
  enrolledAt: string;
  previewUrl?: string;
}

export interface SearchDto {
  id: string;
  workspaceId: string;
  collectionId: string;
  status: SearchStatus;
  resultCount: number;
  retentionExpiresAt: string;
  createdAt: string;
  completedAt: string | null;
}

export interface SearchResultDto {
  id: string;
  searchId: string;
  collectionImageId: string;
  similarityEstimate: number;
  rank: number;
  disclaimer: string;
  previewUrl?: string;
  metadata?: Record<string, string>;
}

export interface AuditLogDto {
  id: string;
  workspaceId: string | null;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  createdAt: string;
}

export interface HealthStatusDto {
  status: "ok" | "degraded";
  service: string;
  version: string;
}

export interface SessionDto {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export interface AuthMeDto {
  user: UserDto;
  workspaces: WorkspaceDto[];
}

export interface WorkspaceMemberDto {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  createdAt: string;
}

export interface WorkspaceDetailDto {
  id: string;
  name: string;
  slug: string;
  retentionDays: number;
  role: WorkspaceRole;
  memberCount: number;
  collectionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentRecordDto {
  id: string;
  workspaceId: string;
  collectionImageId: string;
  authorizationBasis: string;
  grantedByUserId: string;
  status: ConsentStatus;
  withdrawnAt: string | null;
  withdrawalReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadTicketDto {
  imageId: string;
  collectionId: string;
  workspaceId: string;
  storageKey: string;
  uploadUrl: string;
  expiresAt: string;
  consentRecordId: string;
}

export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIALING";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export interface SubscriptionDto {
  id: string;
  workspaceId: string;
  planCode: string;
  status: SubscriptionStatus;
  monthlySearchLimit: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  workspaceId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  externalRef: string | null;
  createdAt: string;
}

export interface BillingOverviewDto {
  subscription: SubscriptionDto | null;
  monthlySearchesUsed: number;
  recentPayments: PaymentDto[];
}

export interface AdminOverviewDto {
  totalUsers: number;
  totalWorkspaces: number;
  totalCollections: number;
  totalSearches: number;
}
