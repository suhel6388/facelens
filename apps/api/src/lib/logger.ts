import pino from "pino";

export const logger = pino({
  name: "facelens-api",
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "password", "passwordHash"],
    censor: "[REDACTED]",
  },
});
