import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * Rate limiter for authentication endpoints (login, register, forgot/reset password).
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === "test" ? 1000 : 25,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again later.",
    },
    meta: { requestId: "rate-limited" },
  },
});
