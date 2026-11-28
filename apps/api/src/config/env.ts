import fs from "node:fs";
import path from "node:path";

const isTest = process.env.NODE_ENV === "test";

// Load .env from apps/api/.env or monorepo root ../../.env when running outside tests
if (!isTest && !process.env.DATABASE_URL) {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && typeof process.loadEnvFile === "function") {
      process.loadEnvFile(candidate);
      break;
    }
  }
}

const isProd = process.env.NODE_ENV === "production";

function readSecret(key: string, devFallback: string): string {
  const value = process.env[key];
  if (value && value.trim().length > 0) {
    return value;
  }
  if (isProd) {
    throw new Error(`Missing required environment variable in production: ${key}`);
  }
  return devFallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd,
  apiPort: Number(process.env.API_PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  redisUrl: process.env.REDIS_URL ?? "",
  aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://localhost:8000",
  razorpayKeySecret: readSecret("RAZORPAY_KEY_SECRET", "dev-razorpay-key-secret"),
  razorpayWebhookSecret: readSecret("RAZORPAY_WEBHOOK_SECRET", "dev-razorpay-webhook-secret"),
  accessTokenSecret: readSecret("ACCESS_TOKEN_SECRET", "dev-access-secret-change-in-production"),
  refreshTokenSecret: readSecret("REFRESH_TOKEN_SECRET", "dev-refresh-secret-change-in-production"),
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlDays: 14,
} as const;
