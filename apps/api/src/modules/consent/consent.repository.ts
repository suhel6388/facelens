import { prisma } from "@app/database";
import type { ConsentRecordDto, ConsentStatus } from "@app/types";

export interface ConsentRepository {
  listByWorkspace(workspaceId: string): Promise<ConsentRecordDto[]>;
  listByImage(workspaceId: string, imageId: string): Promise<ConsentRecordDto[]>;
  withdrawConsent(params: {
    workspaceId: string;
    imageId: string;
    actorId: string;
    reason: string;
  }): Promise<ConsentRecordDto | null>;
}

function toConsentDto(row: {
  id: string;
  workspaceId: string;
  collectionImageId: string;
  authorizationBasis: string;
  grantedByUserId: string;
  status: ConsentStatus;
  withdrawnAt: Date | null;
  withdrawalReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ConsentRecordDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    collectionImageId: row.collectionImageId,
    authorizationBasis: row.authorizationBasis,
    grantedByUserId: row.grantedByUserId,
    status: row.status,
    withdrawnAt: row.withdrawnAt ? row.withdrawnAt.toISOString() : null,
    withdrawalReason: row.withdrawalReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaConsentRepository implements ConsentRepository {
  async listByWorkspace(workspaceId: string): Promise<ConsentRecordDto[]> {
    const rows = await prisma.consentRecord.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toConsentDto);
  }

  async listByImage(workspaceId: string, imageId: string): Promise<ConsentRecordDto[]> {
    const rows = await prisma.consentRecord.findMany({
      where: { workspaceId, collectionImageId: imageId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toConsentDto);
  }

  async withdrawConsent(params: {
    workspaceId: string;
    imageId: string;
    actorId: string;
    reason: string;
  }): Promise<ConsentRecordDto | null> {
    const image = await prisma.collectionImage.findFirst({
      where: { id: params.imageId, workspaceId: params.workspaceId, deletedAt: null },
    });
    if (!image) return null;

    const latestRecord = await prisma.consentRecord.findFirst({
      where: { workspaceId: params.workspaceId, collectionImageId: params.imageId },
      orderBy: { createdAt: "desc" },
    });
    if (!latestRecord) return null;

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      await tx.collectionImage.update({
        where: { id: params.imageId },
        data: { consentStatus: "WITHDRAWN" },
      });
      const record = await tx.consentRecord.update({
        where: { id: latestRecord.id },
        data: {
          status: "WITHDRAWN",
          withdrawnAt: now,
          withdrawalReason: params.reason,
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          actorId: params.actorId,
          action: "CONSENT_WITHDRAWN",
          resourceType: "CollectionImage",
          resourceId: params.imageId,
          metadataJson: { reason: params.reason },
        },
      });
      return record;
    });

    return toConsentDto(updated);
  }
}
