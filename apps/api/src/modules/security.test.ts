import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("Phase 14 Security Controls", () => {
  it("sets Helmet security headers and rate-limit headers on API responses", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["ratelimit"]).toBeDefined();
  });

  it("blocks state-changing cookie-authenticated requests without a matching CSRF header", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/v1/workspaces")
      .set("Cookie", "facelens_access=fake; facelens_csrf=token-a")
      .set("x-csrf-token", "token-b")
      .send({ name: "CSRF Test" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_INVALID");
  });
});
