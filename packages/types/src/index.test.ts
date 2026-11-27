import { describe, expect, it } from "vitest";
import { BRAND_NAME, BRAND_TAGLINE } from "./index.js";

describe("@app/types", () => {
  it("exports original brand constants", () => {
    expect(BRAND_NAME).toBe("FaceLens");
    expect(BRAND_TAGLINE.length).toBeGreaterThan(0);
  });
});
