import { prisma } from "@app/database";
import type { CollectionImageDto, ConsentStatus, UploadTicketDto } from "@app/types";

export interface StoredImageRecord {
  id: string;
  workspaceId: string;
  collectionId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

export interface UploadsRepository {
  collectionExists(workspaceId: string, collectionId: string): Promise<boolean>;
  createEnrollment(params: {
    imageId: string;
    workspaceId: string;
    collectionId: string;
    actorId: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    width: number;
    height: number;
    sha256: string;
    authorizationBasis: string;
    uploadUrl: string;
    expiresAt: Date;
  }): Promise<UploadTicketDto>;
  findImageById(workspaceId: string, imageId: string): Promise<StoredImageRecord | null>;
  updateImageMetadata(
    workspaceId: string,
    imageId: string,
    data: { sizeBytes: number; width: number; height: number; sha256: string },
  ): Promise<void>;
  listCollectionImages(workspaceId: string, collectionId: string): Promise<CollectionImageDto[]>;
  softDeleteImage(workspaceId: string, imageId: string, actorId: string): Promise<string | null>;
}

function toImageDto(row: {
  id: string;
  collectionId: string;
  workspaceId: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  consentStatus: ConsentStatus;
  createdAt: Date;
}): CollectionImageDto {
  return {
    id: row.id,
    collectionId: row.collectionId,
    workspaceId: row.workspaceId,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    sizeBytes: row.sizeBytes,
    consentStatus: row.consentStatus,
    enrolledAt: row.createdAt.toISOString(),
    previewUrl: `/api/v1/workspaces/${row.workspaceId}/uploads/images/${row.id}/content`,
  };
}

export class PrismaUploadsRepository implements UploadsRepository {
  async collectionExists(workspaceId: string, collectionId: string): Promise<boolean> {
    const col = await prisma.collection.findFirst({
      where: { id: collectionId, workspaceId, status: "ACTIVE" },
      select: { id: true },
    });
    return Boolean(col);
  }

  async createEnrollment(params: {
    imageId: string;
    workspaceId: string;
    collectionId: string;
    actorId: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    width: number;
    height: number;
    sha256: string;
    authorizationBasis: string;
    uploadUrl: string;
    expiresAt: Date;
  }): Promise<UploadTicketDto> {
    const result = await prisma.$transaction(async (tx) => {
      const image = await tx.collectionImage.create({
        data: {
          id: params.imageId,
          workspaceId: params.workspaceId,
          collectionId: params.collectionId,
          storageKey: params.storageKey,
          mimeType: params.mimeType,
          sizeBytes: params.sizeBytes,
          width: params.width,
          height: params.height,
          sha256: params.sha256,
          consentStatus: "GRANTED",
        },
      });
      const consent = await tx.consentRecord.create({
        data: {
          workspaceId: params.workspaceId,
          collectionImageId: image.id,
          authorizationBasis: params.authorizationBasis,
          grantedByUserId: params.actorId,
          status: "GRANTED",
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          actorId: params.actorId,
          action: "IMAGE_ENROLLED",
          resourceType: "CollectionImage",
          resourceId: image.id,
          metadataJson: {
            collectionId: params.collectionId,
            mimeType: params.mimeType,
            sizeBytes: params.sizeBytes,
          },
        },
      });
      return { image, consent };
    });

    return {
      imageId: result.image.id,
      collectionId: params.collectionId,
      workspaceId: params.workspaceId,
      storageKey: params.storageKey,
      uploadUrl: params.uploadUrl,
      expiresAt: params.expiresAt.toISOString(),
      consentRecordId: result.consent.id,
    };
  }

  async findImageById(workspaceId: string, imageId: string): Promise<StoredImageRecord | null> {
    const row = await prisma.collectionImage.findFirst({
      where: { id: imageId, workspaceId, deletedAt: null },
      select: {
        id: true,
        workspaceId: true,
        collectionId: true,
        storageKey: true,
        mimeType: true,
        sizeBytes: true,
        width: true,
        height: true,
      },
    });
    return row;
  }

  async updateImageMetadata(
    workspaceId: string,
    imageId: string,
    data: { sizeBytes: number; width: number; height: number; sha256: string },
  ): Promise<void> {
    await prisma.collectionImage.updateMany({
      where: { id: imageId, workspaceId, deletedAt: null },
      data,
    });
  }

  async listCollectionImages(
    workspaceId: string,
    collectionId: string,
  ): Promise<CollectionImageDto[]> {
    const rows = await prisma.collectionImage.findMany({
      where: { workspaceId, collectionId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toImageDto);
  }

  async softDeleteImage(
    workspaceId: string,
    imageId: string,
    actorId: string,
  ): Promise<string | null> {
    const existing = await prisma.collectionImage.findFirst({
      where: { id: imageId, workspaceId, deletedAt: null },
    });
    if (!existing) return null;

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.collectionImage.update({
        where: { id: imageId },
        data: { consentStatus: "PENDING_DELETION", deletedAt: now },
      });
      await tx.auditLog.create({
        data: {
          workspaceId,
          actorId,
          action: "IMAGE_DELETED",
          resourceType: "CollectionImage",
          resourceId: imageId,
        },
      });
    });
    return existing.storageKey;
  }
}
