import { prisma } from "@app/database";
import type { CollectionImageDto, ConsentStatus, UploadTicketDto } from "@app/types";

export interface UploadsRepository {
  collectionExists(workspaceId: string, collectionId: string): Promise<boolean>;
  createEnrollment(params: {
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
  listCollectionImages(workspaceId: string, collectionId: string): Promise<CollectionImageDto[]>;
  softDeleteImage(workspaceId: string, imageId: string, actorId: string): Promise<boolean>;
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

  async softDeleteImage(workspaceId: string, imageId: string, actorId: string): Promise<boolean> {
    const existing = await prisma.collectionImage.findFirst({
      where: { id: imageId, workspaceId, deletedAt: null },
    });
    if (!existing) return false;

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
    return true;
  }
}
