import { describe, expect, it } from "vitest";
import { cn, DESIGN_TOKENS } from "./index.js";

describe("@app/ui", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("exposes DESIGN.md color tokens", () => {
    expect(DESIGN_TOKENS.background).toBe("#08090D");
    expect(DESIGN_TOKENS.primary).toBe("#E94B78");
  });
});
