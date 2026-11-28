import crypto from "node:crypto";
import type { CollectionImageDto, UploadTicketDto } from "@app/types";
import type { CreateUploadTicketInput } from "@app/validation";
import { AppError } from "../../middleware/error-handler.js";
import type { UploadsRepository } from "./uploads.repository.js";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class UploadsService {
  constructor(private readonly repo: UploadsRepository) {}

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
    const fileId = crypto.randomUUID();
    const storageKey = `workspaces/${workspaceId}/collections/${input.collectionId}/${fileId}.${ext}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const uploadUrl = `https://storage.facelens.local/upload/${storageKey}?expires=${expiresAt.getTime()}`;

    return this.repo.createEnrollment({
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

  async listCollectionImages(
    workspaceId: string,
    collectionId: string,
  ): Promise<CollectionImageDto[]> {
    return this.repo.listCollectionImages(workspaceId, collectionId);
  }

  async deleteImage(workspaceId: string, imageId: string, actorId: string): Promise<void> {
    const deleted = await this.repo.softDeleteImage(workspaceId, imageId, actorId);
    if (!deleted) {
      throw new AppError(404, "IMAGE_NOT_FOUND", "Collection image not found.");
    }
  }
}
