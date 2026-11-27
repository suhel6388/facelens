import { describe, expect, it } from "vitest";
import { Prisma } from "./index.js";

describe("@app/database", () => {
  it("exposes Prisma model enums", () => {
    expect(Prisma.ModelName.User).toBe("User");
    expect(Prisma.ModelName.Collection).toBe("Collection");
    expect(Prisma.ModelName.ConsentRecord).toBe("ConsentRecord");
    expect(Prisma.ModelName.Search).toBe("Search");
  });
});
