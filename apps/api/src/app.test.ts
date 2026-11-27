import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("API health endpoints", () => {
  it("returns standard envelope on GET /api/v1/health", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      status: "ok",
      service: "api",
      version: "0.1.0",
    });
    expect(typeof res.body.meta.requestId).toBe("string");
    expect(res.headers["x-request-id"]).toBe(res.body.meta.requestId);
  });
});
