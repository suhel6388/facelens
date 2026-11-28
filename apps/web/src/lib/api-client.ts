import type {
  AdminOverviewDto,
  ApiErrorResponse,
  ApiSuccessResponse,
  AuditLogDto,
  AuthMeDto,
  BillingOverviewDto,
  CollectionDto,
  CollectionImageDto,
  ConsentRecordDto,
  InvoiceDto,
  PaginationMeta,
  PaymentDto,
  SearchDto,
  SearchResultDto,
  SessionDto,
  SubscriptionDto,
  UploadTicketDto,
  UserDto,
  WorkspaceDetailDto,
  WorkspaceDto,
  WorkspaceMemberDto,
} from "@app/types";
import type {
  AddWorkspaceMemberInput,
  CreateCollectionInput,
  CreatePaymentCheckoutInput,
  CreateSearchInput,
  CreateUploadTicketInput,
  CreateWorkspaceInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateCollectionInput,
  UpdateProfileInput,
  UpdateSubscriptionInput,
  UpdateWorkspaceInput,
  VerifyEmailInput,
  VerifyRazorpayPaymentInput,
} from "@app/validation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith("facelens_csrf="));
  return match ? decodeURIComponent(match.slice("facelens_csrf=".length)) : null;
}

async function requestEnvelope<T, M = { requestId: string }>(
  path: string,
  init: RequestInit = {},
): Promise<ApiSuccessResponse<T, M & { requestId: string }>> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrf = readCsrfCookie();
    if (csrf) {
      headers.set("x-csrf-token", csrf);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let code = "REQUEST_FAILED";
    let message = "Request failed.";
    try {
      const errBody = (await response.json()) as ApiErrorResponse;
      if (errBody?.error?.code) code = errBody.error.code;
      if (errBody?.error?.message) message = errBody.error.message;
    } catch {
      // Ignore non-JSON error body
    }
    throw new ApiClientError(response.status, code, message);
  }

  return (await response.json()) as ApiSuccessResponse<T, M & { requestId: string }>;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const body = await requestEnvelope<T>(path, init);
  return body.data;
}

export const authApi = {
  register(input: RegisterInput): Promise<AuthMeDto> {
    return apiFetch<AuthMeDto>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  login(input: LoginInput): Promise<AuthMeDto> {
    return apiFetch<AuthMeDto>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  logout(): Promise<{ loggedOut: boolean }> {
    return apiFetch<{ loggedOut: boolean }>("/auth/logout", {
      method: "POST",
    });
  },
  me(): Promise<AuthMeDto> {
    return apiFetch<AuthMeDto>("/auth/me");
  },
  verifyEmail(input: VerifyEmailInput): Promise<{ verified: boolean }> {
    return apiFetch<{ verified: boolean }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  resetPassword(input: ResetPasswordInput): Promise<{ reset: boolean }> {
    return apiFetch<{ reset: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  listSessions(): Promise<SessionDto[]> {
    return apiFetch<SessionDto[]>("/auth/sessions");
  },
  revokeSession(sessionId: string): Promise<{ revoked: boolean }> {
    return apiFetch<{ revoked: boolean }>(`/auth/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },
};

export const usersApi = {
  getMe(): Promise<UserDto> {
    return apiFetch<UserDto>("/users/me");
  },
  updateMe(input: UpdateProfileInput): Promise<UserDto> {
    return apiFetch<UserDto>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  deleteMe(): Promise<{ deleted: boolean }> {
    return apiFetch<{ deleted: boolean }>("/users/me", {
      method: "DELETE",
    });
  },
};

export const workspacesApi = {
  list(): Promise<WorkspaceDto[]> {
    return apiFetch<WorkspaceDto[]>("/workspaces");
  },
  create(input: CreateWorkspaceInput): Promise<WorkspaceDto> {
    return apiFetch<WorkspaceDto>("/workspaces", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  getDetail(workspaceId: string): Promise<WorkspaceDetailDto> {
    return apiFetch<WorkspaceDetailDto>(`/workspaces/${workspaceId}`);
  },
  update(workspaceId: string, input: UpdateWorkspaceInput): Promise<WorkspaceDetailDto> {
    return apiFetch<WorkspaceDetailDto>(`/workspaces/${workspaceId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  listMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
    return apiFetch<WorkspaceMemberDto[]>(`/workspaces/${workspaceId}/members`);
  },
  addMember(workspaceId: string, input: AddWorkspaceMemberInput): Promise<WorkspaceMemberDto> {
    return apiFetch<WorkspaceMemberDto>(`/workspaces/${workspaceId}/members`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  removeMember(workspaceId: string, memberId: string): Promise<{ removed: boolean }> {
    return apiFetch<{ removed: boolean }>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "DELETE",
    });
  },
};

export const collectionsApi = {
  list(workspaceId: string): Promise<CollectionDto[]> {
    return apiFetch<CollectionDto[]>(`/workspaces/${workspaceId}/collections`);
  },
  getById(workspaceId: string, collectionId: string): Promise<CollectionDto> {
    return apiFetch<CollectionDto>(`/workspaces/${workspaceId}/collections/${collectionId}`);
  },
  create(workspaceId: string, input: CreateCollectionInput): Promise<CollectionDto> {
    return apiFetch<CollectionDto>(`/workspaces/${workspaceId}/collections`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  update(
    workspaceId: string,
    collectionId: string,
    input: UpdateCollectionInput,
  ): Promise<CollectionDto> {
    return apiFetch<CollectionDto>(`/workspaces/${workspaceId}/collections/${collectionId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  remove(workspaceId: string, collectionId: string): Promise<{ deleted: boolean }> {
    return apiFetch<{ deleted: boolean }>(
      `/workspaces/${workspaceId}/collections/${collectionId}`,
      { method: "DELETE" },
    );
  },
};

export const uploadsApi = {
  createTicket(workspaceId: string, input: CreateUploadTicketInput): Promise<UploadTicketDto> {
    return apiFetch<UploadTicketDto>(`/workspaces/${workspaceId}/uploads/ticket`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  uploadDirect(
    uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{
    imageId: string;
    mimeType: string;
    width: number;
    height: number;
    sizeBytes: number;
    metadataStripped: boolean;
  }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const targetUrl = uploadUrl.startsWith("http")
        ? uploadUrl
        : `${API_BASE_URL.replace(/\/api\/v1$/, "")}${uploadUrl}`;
      xhr.open("PUT", targetUrl, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Content-Type", file.type);
      const csrf = readCsrfCookie();
      if (csrf) {
        xhr.setRequestHeader("x-csrf-token", csrf);
      }

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(parsed.data);
          } else {
            reject(
              new ApiClientError(
                xhr.status,
                parsed?.error?.code ?? "UPLOAD_FAILED",
                parsed?.error?.message ?? "Image upload failed.",
              ),
            );
          }
        } catch {
          reject(new ApiClientError(xhr.status, "UPLOAD_FAILED", "Image upload failed."));
        }
      };

      xhr.onerror = () => {
        reject(new ApiClientError(0, "NETWORK_ERROR", "Network error during upload."));
      };

      xhr.send(file);
    });
  },
  listImages(workspaceId: string, collectionId: string): Promise<CollectionImageDto[]> {
    return apiFetch<CollectionImageDto[]>(
      `/workspaces/${workspaceId}/uploads/collections/${collectionId}/images`,
    );
  },
  deleteImage(workspaceId: string, imageId: string): Promise<{ deleted: boolean }> {
    return apiFetch<{ deleted: boolean }>(`/workspaces/${workspaceId}/uploads/images/${imageId}`, {
      method: "DELETE",
    });
  },
};

export const consentApi = {
  listByWorkspace(workspaceId: string): Promise<ConsentRecordDto[]> {
    return apiFetch<ConsentRecordDto[]>(`/workspaces/${workspaceId}/consent`);
  },
  listByCollection(workspaceId: string, collectionId: string): Promise<ConsentRecordDto[]> {
    return apiFetch<ConsentRecordDto[]>(
      `/workspaces/${workspaceId}/consent/collections/${collectionId}`,
    );
  },
  withdraw(workspaceId: string, imageId: string, reason: string): Promise<ConsentRecordDto> {
    return apiFetch<ConsentRecordDto>(
      `/workspaces/${workspaceId}/consent/images/${imageId}/withdraw`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  },
};

export interface SearchWithResultsDto {
  search: SearchDto;
  results: SearchResultDto[];
}

export const searchesApi = {
  async list(
    workspaceId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: SearchDto[]; meta: PaginationMeta }> {
    const res = await requestEnvelope<SearchDto[], PaginationMeta>(
      `/workspaces/${workspaceId}/searches?page=${page}&limit=${limit}`,
    );
    return { items: res.data, meta: res.meta };
  },
  create(workspaceId: string, input: CreateSearchInput): Promise<SearchDto> {
    return apiFetch<SearchDto>(`/workspaces/${workspaceId}/searches`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  getById(workspaceId: string, searchId: string): Promise<SearchWithResultsDto> {
    return apiFetch<SearchWithResultsDto>(`/workspaces/${workspaceId}/searches/${searchId}`);
  },
  cancel(workspaceId: string, searchId: string): Promise<SearchDto> {
    return apiFetch<SearchDto>(`/workspaces/${workspaceId}/searches/${searchId}/cancel`, {
      method: "POST",
    });
  },
  remove(workspaceId: string, searchId: string): Promise<{ deleted: boolean }> {
    return apiFetch<{ deleted: boolean }>(`/workspaces/${workspaceId}/searches/${searchId}`, {
      method: "DELETE",
    });
  },
};

export const billingApi = {
  getOverview(workspaceId: string): Promise<BillingOverviewDto> {
    return apiFetch<BillingOverviewDto>(`/workspaces/${workspaceId}/billing`);
  },
  updateSubscription(
    workspaceId: string,
    input: UpdateSubscriptionInput,
  ): Promise<SubscriptionDto> {
    return apiFetch<SubscriptionDto>(`/workspaces/${workspaceId}/billing/subscription`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },
  createCheckout(
    workspaceId: string,
    input: CreatePaymentCheckoutInput,
  ): Promise<{ payment: PaymentDto; checkoutUrl: string; orderId: string }> {
    return apiFetch<{ payment: PaymentDto; checkoutUrl: string; orderId: string }>(
      `/workspaces/${workspaceId}/billing/checkout`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  },
  verifyPayment(
    workspaceId: string,
    input: VerifyRazorpayPaymentInput,
  ): Promise<{ verified: boolean; subscription: SubscriptionDto }> {
    return apiFetch<{ verified: boolean; subscription: SubscriptionDto }>(
      `/workspaces/${workspaceId}/billing/verify`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  },
  listPayments(workspaceId: string): Promise<PaymentDto[]> {
    return apiFetch<PaymentDto[]>(`/workspaces/${workspaceId}/billing/payments`);
  },
  listInvoices(workspaceId: string): Promise<InvoiceDto[]> {
    return apiFetch<InvoiceDto[]>(`/workspaces/${workspaceId}/billing/invoices`);
  },
};

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

export const adminApi = {
  getOverview(): Promise<AdminOverviewDto> {
    return apiFetch<AdminOverviewDto>("/admin/overview");
  },
  listUsers(page = 1, limit = 20): Promise<UserDto[]> {
    return apiFetch<UserDto[]>(`/admin/users?page=${page}&limit=${limit}`);
  },
  listWorkspaces(page = 1, limit = 20): Promise<AdminWorkspaceSummaryDto[]> {
    return apiFetch<AdminWorkspaceSummaryDto[]>(`/admin/workspaces?page=${page}&limit=${limit}`);
  },
  listSubscriptions(page = 1, limit = 20): Promise<AdminSubscriptionSummaryDto[]> {
    return apiFetch<AdminSubscriptionSummaryDto[]>(
      `/admin/subscriptions?page=${page}&limit=${limit}`,
    );
  },
  listPayments(page = 1, limit = 20): Promise<AdminPaymentSummaryDto[]> {
    return apiFetch<AdminPaymentSummaryDto[]>(`/admin/payments?page=${page}&limit=${limit}`);
  },
  getAnalytics(): Promise<AdminAnalyticsDto> {
    return apiFetch<AdminAnalyticsDto>("/admin/analytics");
  },
  listAuditLogs(page = 1, limit = 30): Promise<AuditLogDto[]> {
    return apiFetch<AuditLogDto[]>(`/admin/audit-logs?page=${page}&limit=${limit}`);
  },
  listDeletionRequests(page = 1, limit = 20): Promise<AdminDeletionRequestDto[]> {
    return apiFetch<AdminDeletionRequestDto[]>(
      `/admin/deletion-requests?page=${page}&limit=${limit}`,
    );
  },
  purgeDeletionRequest(imageId: string): Promise<{ purged: boolean }> {
    return apiFetch<{ purged: boolean }>(`/admin/deletion-requests/${imageId}/purge`, {
      method: "POST",
    });
  },
  getSystemHealth(): Promise<AdminSystemHealthDto> {
    return apiFetch<AdminSystemHealthDto>("/admin/system-health");
  },
};
