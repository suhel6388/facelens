import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

export interface PrivateStorageAdapter {
  createSignedUploadUrl(params: {
    workspaceId: string;
    imageId: string;
    storageKey: string;
    expiresAt: Date;
  }): string;
  verifyUploadSignature(params: {
    workspaceId: string;
    imageId: string;
    storageKey: string;
    expires: number;
    signature: string;
  }): boolean;
  putObject(storageKey: string, data: Buffer): Promise<void>;
  getObject(storageKey: string): Promise<Buffer | null>;
  deleteObject(storageKey: string): Promise<void>;
}

function resolveSafePath(rootDir: string, storageKey: string): string {
  const normalized = storageKey.replace(/^\/+/, "");
  const fullPath = path.resolve(rootDir, normalized);
  const resolvedRoot = path.resolve(rootDir);
  if (!fullPath.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Invalid storage key path traversal attempt.");
  }
  return fullPath;
}

export class LocalPrivateStorageAdapter implements PrivateStorageAdapter {
  private readonly rootDir: string;

  constructor(
    rootDir = process.env.PRIVATE_STORAGE_DIR ?? path.resolve(process.cwd(), ".private-storage"),
  ) {
    this.rootDir = rootDir;
  }

  private signPayload(payload: string): string {
    return crypto.createHmac("sha256", env.accessTokenSecret).update(payload).digest("hex");
  }

  createSignedUploadUrl(params: {
    workspaceId: string;
    imageId: string;
    storageKey: string;
    expiresAt: Date;
  }): string {
    const expires = params.expiresAt.getTime();
    const payload = `${params.workspaceId}:${params.imageId}:${params.storageKey}:${expires}`;
    const sig = this.signPayload(payload);
    return `/api/v1/workspaces/${params.workspaceId}/uploads/direct/${params.imageId}?expires=${expires}&sig=${sig}`;
  }

  verifyUploadSignature(params: {
    workspaceId: string;
    imageId: string;
    storageKey: string;
    expires: number;
    signature: string;
  }): boolean {
    if (!Number.isFinite(params.expires) || Date.now() > params.expires) {
      return false;
    }
    const payload = `${params.workspaceId}:${params.imageId}:${params.storageKey}:${params.expires}`;
    const expected = this.signPayload(payload);
    const sigBuf = Buffer.from(params.signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  async putObject(storageKey: string, data: Buffer): Promise<void> {
    const fullPath = resolveSafePath(this.rootDir, storageKey);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
  }

  async getObject(storageKey: string): Promise<Buffer | null> {
    const fullPath = resolveSafePath(this.rootDir, storageKey);
    try {
      return await fs.readFile(fullPath);
    } catch {
      return null;
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    const fullPath = resolveSafePath(this.rootDir, storageKey);
    try {
      await fs.unlink(fullPath);
    } catch {
      // Ignore if object was never uploaded or already removed
    }
  }
}
