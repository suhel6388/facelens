import { z } from "zod";

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const registerSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters.")
    .max(128, "Password must be at most 128 characters."),
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and privacy notice." }),
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(16, "Verification token is invalid."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(16, "Reset token is invalid."),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters.")
    .max(128, "Password must be at most 128 characters."),
});

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const createCollectionSchema = z.object({
  name: z.string().trim().min(2, "Collection name is required.").max(100),
  description: z.string().trim().max(500).optional(),
  purpose: z.string().trim().min(10, "Please describe the authorized purpose.").max(500),
  authorityConfirmed: z.literal(true, {
    errorMap: () => ({
      message: "You must confirm documented authority to manage this collection.",
    }),
  }),
});

export const enrollImageSchema = z.object({
  collectionId: z.string().uuid(),
  authorizationBasis: z
    .string()
    .trim()
    .min(10, "Documented authorization basis is required.")
    .max(500),
  consentConfirmed: z.literal(true, {
    errorMap: () => ({
      message: "Explicit consent/authorization confirmation is required before enrollment.",
    }),
  }),
  subjectAdultConfirmed: z.literal(true, {
    errorMap: () => ({
      message: "You must confirm that no minors are depicted in this image.",
    }),
  }),
});

export const createSearchSchema = z.object({
  collectionId: z.string().uuid("Please select an authorized collection."),
  purposeConfirmed: z.literal(true, {
    errorMap: () => ({
      message: "You must confirm the permitted purpose and collection access.",
    }),
  }),
});

export const withdrawConsentSchema = z.object({
  reason: z.string().trim().min(5, "Please provide a brief reason for withdrawal.").max(500),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid resource ID format."),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
});

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    retentionDays: z.coerce.number().int().min(1).max(365).optional(),
  })
  .refine((data) => data.name !== undefined || data.retentionDays !== undefined, {
    message: "At least one field must be provided.",
  });

export const addWorkspaceMemberSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  role: z.enum(["OWNER", "MEMBER", "VIEWER"]).default("MEMBER"),
});

export const updateWorkspaceMemberSchema = z.object({
  role: z.enum(["OWNER", "MEMBER", "VIEWER"]),
});

export const updateCollectionSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    purpose: z.string().trim().min(10).max(500).optional(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.purpose !== undefined ||
      data.status !== undefined,
    { message: "At least one field must be provided." },
  );

export const createUploadTicketSchema = enrollImageSchema.extend({
  mimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES),
  sizeBytes: z.coerce.number().int().min(1).max(MAX_UPLOAD_SIZE_BYTES),
  width: z.coerce.number().int().min(64).max(10000),
  height: z.coerce.number().int().min(64).max(10000),
  sha256: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/, "Valid SHA-256 hex digest is required."),
});

export const updateSubscriptionSchema = z.object({
  planCode: z.enum(["FREE", "STARTER", "PRO", "BUSINESS", "ENTERPRISE"]),
});

export const createPaymentCheckoutSchema = z.object({
  planCode: z.enum(["STARTER", "PRO", "BUSINESS", "ENTERPRISE"]),
  currency: z.string().trim().length(3).default("USD"),
});

export const verifyRazorpayPaymentSchema = z.object({
  razorpay_order_id: z.string().trim().min(4),
  razorpay_payment_id: z.string().trim().min(4),
  razorpay_signature: z.string().trim().min(16),
  planCode: z.enum(["STARTER", "PRO", "BUSINESS", "ENTERPRISE"]),
});

export const adminAuditLogsQuerySchema = paginationSchema.extend({
  workspaceId: z.string().uuid().optional(),
  action: z.string().trim().max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;
export type UpdateWorkspaceMemberInput = z.infer<typeof updateWorkspaceMemberSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type EnrollImageInput = z.infer<typeof enrollImageSchema>;
export type CreateUploadTicketInput = z.infer<typeof createUploadTicketSchema>;
export type CreateSearchInput = z.infer<typeof createSearchSchema>;
export type WithdrawConsentInput = z.infer<typeof withdrawConsentSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type CreatePaymentCheckoutInput = z.infer<typeof createPaymentCheckoutSchema>;
export type VerifyRazorpayPaymentInput = z.infer<typeof verifyRazorpayPaymentSchema>;
export type AdminAuditLogsQuery = z.infer<typeof adminAuditLogsQuerySchema>;
