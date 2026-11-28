import crypto from "node:crypto";
import type { CollectionImageDto, UploadTicketDto } from "@app/types";
import type { CreateUploadTicketInput } from "@app/validation";
import { inspectAndSanitizeImage } from "../../lib/image-security.js";
import type { PrivateStorageAdapter } from "../../lib/storage.js";
import { AppError } from "../../middleware/error-handler.js";
import type { UploadsRepository } from "./uploads.repository.js";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const IMAGE_VALIDATION_ERRORS: Record<string, { status: number; message: string }> = {
  EMPTY_FILE: { status: 400, message: "Uploaded file is empty." },
  FILE_TOO_LARGE: { status: 413, message: "Uploaded image exceeds the 10 MB size limit." },
  INVALID_FILE_SIGNATURE: {
    status: 400,
    message: "File signature does not match an allowed image format (JPEG, PNG, WebP).",
  },
  MIME_MISMATCH: {
    status: 400,
    message: "Uploaded file signature does not match the declared MIME type.",
  },
  INVALID_DIMENSIONS: {
    status: 400,
    message: "Image dimensions must be between 64x64 and 10000x10000 pixels.",
  },
};

export class UploadsService {
  constructor(
    private readonly repo: UploadsRepository,
    private readonly storage: PrivateStorageAdapter,
  ) {}

  async createUploadTicket(
    workspaceId: string,
    actorId: string,
    input: CreateUploadTicketInput,
  ): Promise<UploadTicketDto> {
    const exists = await this.repo.collectionExists(workspaceId, input.collectionId);
    if (!exists) {
      throw new AppError(
        404,
        "COLLECTION_NOT_FOUND",
        "Active collection not found in this workspace.",
      );
    }

    const ext = MIME_TO_EXT[input.mimeType] ?? "bin";
    const imageId = crypto.randomUUID();
    const storageKey = `workspaces/${workspaceId}/collections/${input.collectionId}/${imageId}.${ext}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const uploadUrl = this.storage.createSignedUploadUrl({
      workspaceId,
      imageId,
      storageKey,
      expiresAt,
    });

    return this.repo.createEnrollment({
      imageId,
      workspaceId,
      collectionId: input.collectionId,
      actorId,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      width: input.width,
      height: input.height,
      sha256: input.sha256.toLowerCase(),
      authorizationBasis: input.authorizationBasis,
      uploadUrl,
      expiresAt,
    });
  }

  async uploadDirect(params: {
    workspaceId: string;
    imageId: string;
    expires: number;
    signature: string;
    buffer: Buffer;
  }): Promise<{
    imageId: string;
    mimeType: string;
    width: number;
    height: number;
    sizeBytes: number;
    metadataStripped: boolean;
  }> {
    const record = await this.repo.findImageById(params.workspaceId, params.imageId);
    if (!record) {
      throw new AppError(404, "IMAGE_NOT_FOUND", "Enrollment record not found.");
    }

    const validSig = this.storage.verifyUploadSignature({
      workspaceId: params.workspaceId,
      imageId: params.imageId,
      storageKey: record.storageKey,
      expires: params.expires,
      signature: params.signature,
    });
    if (!validSig) {
      throw new AppError(403, "INVALID_UPLOAD_SIGNATURE", "Upload URL is invalid or expired.");
    }

    let inspected;
    try {
      inspected = inspectAndSanitizeImage(params.buffer, record.mimeType);
    } catch (err) {
      const key = err instanceof Error ? err.message : "INVALID_FILE_SIGNATURE";
      const mapped = IMAGE_VALIDATION_ERRORS[key] ?? {
        status: 400,
        message: "Uploaded image failed validation.",
      };
      throw new AppError(mapped.status, key, mapped.message);
    }

    await this.storage.putObject(record.storageKey, inspected.strippedBuffer);
    await this.repo.updateImageMetadata(params.workspaceId, params.imageId, {
      sizeBytes: inspected.strippedBuffer.length,
      width: inspected.width,
      height: inspected.height,
      sha256: inspected.sha256,
    });

    return {
      imageId: record.id,
      mimeType: inspected.mimeType,
      width: inspected.width,
      height: inspected.height,
      sizeBytes: inspected.strippedBuffer.length,
      metadataStripped: inspected.metadataStripped,
    };
  }

  async getImageContent(
    workspaceId: string,
    imageId: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const record = await this.repo.findImageById(workspaceId, imageId);
    if (!record) {
      throw new AppError(404, "IMAGE_NOT_FOUND", "Collection image not found.");
    }
    const buffer = await this.storage.getObject(record.storageKey);
    if (!buffer) {
      throw new AppError(404, "IMAGE_CONTENT_NOT_FOUND", "Image binary not uploaded yet.");
    }
    return { buffer, mimeType: record.mimeType };
  }

  async listCollectionImages(
    workspaceId: string,
    collectionId: string,
  ): Promise<CollectionImageDto[]> {
    return this.repo.listCollectionImages(workspaceId, collectionId);
  }

  async deleteImage(workspaceId: string, imageId: string, actorId: string): Promise<void> {
    const storageKey = await this.repo.softDeleteImage(workspaceId, imageId, actorId);
    if (!storageKey) {
      throw new AppError(404, "IMAGE_NOT_FOUND", "Collection image not found.");
    }
    await this.storage.deleteObject(storageKey);
  }
}
