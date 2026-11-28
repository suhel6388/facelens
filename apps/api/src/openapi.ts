export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "FaceLens API",
    version: "0.1.0",
    description:
      "Authorized Private Collection Visual Similarity Search API. All searches are strictly scoped to authorized workspace collections with explicit consent and audit logging.",
  },
  servers: [
    {
      url: "/api/v1",
      description: "API v1",
    },
  ],
  tags: [
    { name: "Health", description: "Service health checks" },
    { name: "Auth", description: "Authentication, sessions, and password recovery" },
    { name: "Users", description: "Current user profile management" },
    { name: "Workspaces", description: "Workspace and member management" },
    { name: "Collections", description: "Authorized private image collections" },
    { name: "Consent", description: "Consent records and withdrawal workflows" },
    { name: "Uploads", description: "Signed upload tickets and enrolled image lifecycle" },
    { name: "Searches", description: "Visual similarity search jobs and results" },
    { name: "Billing", description: "Workspace subscriptions, usage, and payments" },
    { name: "Admin", description: "Platform administration and audit logs" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "facelens_access",
      },
    },
    schemas: {
      ApiMeta: {
        type: "object",
        properties: {
          requestId: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
        required: ["requestId"],
      },
      ApiErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
            required: ["code", "message"],
          },
          meta: { $ref: "#/components/schemas/ApiMeta" },
        },
        required: ["error", "meta"],
      },
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "API health check",
        security: [],
        responses: { "200": { description: "Service is healthy" } },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user account",
        security: [],
        responses: {
          "201": { description: "User registered and session cookies set" },
          "400": { description: "Validation error" },
          "409": { description: "Email already exists" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Sign in with email and password",
        security: [],
        responses: {
          "200": { description: "Authenticated" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh token and issue new access token",
        security: [],
        responses: {
          "200": { description: "Tokens rotated" },
          "401": { description: "Invalid refresh token" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Revoke current session and clear cookies",
        responses: { "200": { description: "Logged out" } },
      },
    },
    "/auth/verify-email": {
      post: {
        tags: ["Auth"],
        summary: "Verify email using verification token",
        security: [],
        responses: { "200": { description: "Email verified" } },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset link",
        security: [],
        responses: { "200": { description: "Reset request accepted" } },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using reset token",
        security: [],
        responses: { "200": { description: "Password reset" } },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get authenticated user and workspace memberships",
        responses: { "200": { description: "Authenticated user context" } },
      },
    },
    "/auth/sessions": {
      get: {
        tags: ["Auth"],
        summary: "List active sessions",
        responses: { "200": { description: "Active sessions list" } },
      },
    },
    "/auth/sessions/{sessionId}": {
      delete: {
        tags: ["Auth"],
        summary: "Revoke a specific session",
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Session revoked" } },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get current user profile",
        responses: { "200": { description: "User profile" } },
      },
      patch: {
        tags: ["Users"],
        summary: "Update current user profile",
        responses: { "200": { description: "Updated user profile" } },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete current user account",
        responses: { "200": { description: "Account deleted" } },
      },
    },
    "/workspaces": {
      get: {
        tags: ["Workspaces"],
        summary: "List workspaces for current user",
        responses: { "200": { description: "Workspace list" } },
      },
      post: {
        tags: ["Workspaces"],
        summary: "Create a new workspace",
        responses: { "201": { description: "Workspace created" } },
      },
    },
    "/workspaces/{workspaceId}": {
      get: {
        tags: ["Workspaces"],
        summary: "Get workspace detail",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Workspace detail" } },
      },
      patch: {
        tags: ["Workspaces"],
        summary: "Update workspace settings (Owner only)",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Workspace updated" } },
      },
    },
    "/workspaces/{workspaceId}/members": {
      get: {
        tags: ["Workspaces"],
        summary: "List workspace members",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Members list" } },
      },
      post: {
        tags: ["Workspaces"],
        summary: "Add member to workspace (Owner only)",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "201": { description: "Member added" } },
      },
    },
    "/workspaces/{workspaceId}/members/{memberId}": {
      patch: {
        tags: ["Workspaces"],
        summary: "Update member role (Owner only)",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "memberId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Member updated" } },
      },
      delete: {
        tags: ["Workspaces"],
        summary: "Remove member from workspace (Owner only)",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "memberId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Member removed" } },
      },
    },
    "/workspaces/{workspaceId}/collections": {
      get: {
        tags: ["Collections"],
        summary: "List authorized collections in workspace",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Collections list" } },
      },
      post: {
        tags: ["Collections"],
        summary: "Create a new authorized collection",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "201": { description: "Collection created" } },
      },
    },
    "/workspaces/{workspaceId}/collections/{collectionId}": {
      get: {
        tags: ["Collections"],
        summary: "Get collection by ID",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "collectionId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Collection details" } },
      },
      patch: {
        tags: ["Collections"],
        summary: "Update collection metadata or status",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "collectionId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Collection updated" } },
      },
      delete: {
        tags: ["Collections"],
        summary: "Soft-delete collection",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "collectionId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Collection deleted" } },
      },
    },
    "/workspaces/{workspaceId}/consent": {
      get: {
        tags: ["Consent"],
        summary: "List consent records in workspace",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Consent records" } },
      },
    },
    "/workspaces/{workspaceId}/consent/images/{imageId}": {
      get: {
        tags: ["Consent"],
        summary: "List consent history for a collection image",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "imageId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Consent history" } },
      },
    },
    "/workspaces/{workspaceId}/consent/images/{imageId}/withdraw": {
      post: {
        tags: ["Consent"],
        summary: "Withdraw consent for an enrolled image",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "imageId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Consent withdrawn" } },
      },
    },
    "/workspaces/{workspaceId}/uploads/ticket": {
      post: {
        tags: ["Uploads"],
        summary: "Create an image enrollment record and signed upload ticket",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "201": { description: "Upload ticket issued" } },
      },
    },
    "/workspaces/{workspaceId}/uploads/collections/{collectionId}/images": {
      get: {
        tags: ["Uploads"],
        summary: "List enrolled images in a collection",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "collectionId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Enrolled images" } },
      },
    },
    "/workspaces/{workspaceId}/uploads/images/{imageId}": {
      delete: {
        tags: ["Uploads"],
        summary: "Schedule deletion for an enrolled image",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "imageId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Image marked for deletion" } },
      },
    },
    "/workspaces/{workspaceId}/searches": {
      get: {
        tags: ["Searches"],
        summary: "List searches in workspace",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Paginated searches" } },
      },
      post: {
        tags: ["Searches"],
        summary: "Queue a new similarity search job",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "201": { description: "Search queued" } },
      },
    },
    "/workspaces/{workspaceId}/searches/{searchId}": {
      get: {
        tags: ["Searches"],
        summary: "Get search status and similarity estimate results",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "searchId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Search details and results" } },
      },
      delete: {
        tags: ["Searches"],
        summary: "Soft-delete search and results",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "searchId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Search deleted" } },
      },
    },
    "/workspaces/{workspaceId}/searches/{searchId}/cancel": {
      post: {
        tags: ["Searches"],
        summary: "Cancel a queued or running search",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "searchId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Search cancelled" } },
      },
    },
    "/workspaces/{workspaceId}/billing": {
      get: {
        tags: ["Billing"],
        summary: "Get workspace subscription, usage, and recent payments",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Billing overview" } },
      },
    },
    "/workspaces/{workspaceId}/billing/subscription": {
      put: {
        tags: ["Billing"],
        summary: "Update workspace subscription plan (Owner only)",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Subscription updated" } },
      },
    },
    "/workspaces/{workspaceId}/billing/checkout": {
      post: {
        tags: ["Billing"],
        summary: "Create payment checkout session (Owner only)",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "201": { description: "Checkout created" } },
      },
    },
    "/workspaces/{workspaceId}/billing/payments": {
      get: {
        tags: ["Billing"],
        summary: "List workspace payments (Owner only)",
        parameters: [
          {
            name: "workspaceId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: { "200": { description: "Payments list" } },
      },
    },
    "/admin/overview": {
      get: {
        tags: ["Admin"],
        summary: "Platform metrics overview (Admin only)",
        responses: { "200": { description: "Platform overview" } },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List all users (Admin only)",
        responses: { "200": { description: "Paginated users" } },
      },
    },
    "/admin/workspaces": {
      get: {
        tags: ["Admin"],
        summary: "List all workspaces (Admin only)",
        responses: { "200": { description: "Paginated workspaces" } },
      },
    },
    "/admin/audit-logs": {
      get: {
        tags: ["Admin"],
        summary: "Query platform audit logs (Admin only)",
        responses: { "200": { description: "Paginated audit logs" } },
      },
    },
  },
} as const;
