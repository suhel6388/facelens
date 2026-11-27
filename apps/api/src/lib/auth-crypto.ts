import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "@app/types";
import { env } from "../config/env.js";

const BCRYPT_ROUNDS = env.nodeEnv === "test" ? 4 : 12;

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  role: UserRole;
  emailVerified: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.accessTokenSecret, {
    expiresIn: env.accessTokenTtlSeconds,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.accessTokenSecret);
  if (typeof decoded === "string" || !decoded || typeof decoded.sub !== "string") {
    throw new Error("Invalid access token payload");
  }
  return {
    sub: decoded.sub,
    sid: typeof decoded.sid === "string" ? decoded.sid : "",
    role: decoded.role === "ADMIN" ? "ADMIN" : "USER",
    emailVerified: Boolean(decoded.emailVerified),
  };
}
