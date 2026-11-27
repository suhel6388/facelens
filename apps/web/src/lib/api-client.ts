import type { ApiErrorResponse, ApiSuccessResponse, AuthMeDto, SessionDto } from "@app/types";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
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

  const body = (await response.json()) as ApiSuccessResponse<T>;
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
