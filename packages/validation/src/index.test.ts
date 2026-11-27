import { describe, expect, it } from "vitest";
import {
  createCollectionSchema,
  createSearchSchema,
  enrollImageSchema,
  registerSchema,
} from "./index.js";

describe("@app/validation", () => {
  it("requires terms acceptance on registration", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "a-very-strong-password-123",
      name: "Test User",
      acceptedTerms: false,
    });
    expect(result.success).toBe(false);
  });

  it("requires authority confirmation when creating a collection", () => {
    const result = createCollectionSchema.safeParse({
      name: "Authorized Demo Set",
      purpose: "Testing authorized similarity comparisons",
      authorityConfirmed: false,
    });
    expect(result.success).toBe(false);
  });

  it("requires consent and adult confirmation before enrolling an image", () => {
    const valid = enrollImageSchema.safeParse({
      collectionId: "11111111-1111-4111-8111-111111111111",
      authorizationBasis: "Signed model release #2026-01",
      consentConfirmed: true,
      subjectAdultConfirmed: true,
    });
    expect(valid.success).toBe(true);

    const missingAdult = enrollImageSchema.safeParse({
      collectionId: "11111111-1111-4111-8111-111111111111",
      authorizationBasis: "Signed model release #2026-01",
      consentConfirmed: true,
      subjectAdultConfirmed: false,
    });
    expect(missingAdult.success).toBe(false);
  });

  it("requires purpose confirmation on search creation", () => {
    const result = createSearchSchema.safeParse({
      collectionId: "11111111-1111-4111-8111-111111111111",
      purposeConfirmed: false,
    });
    expect(result.success).toBe(false);
  });
});
