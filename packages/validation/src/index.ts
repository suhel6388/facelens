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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type EnrollImageInput = z.infer<typeof enrollImageSchema>;
export type CreateSearchInput = z.infer<typeof createSearchSchema>;
export type WithdrawConsentInput = z.infer<typeof withdrawConsentSchema>;
