import { prisma } from "@app/database";
import type { CollectionDto, CollectionStatus } from "@app/types";

export interface CollectionsRepository {
  list(workspaceId: string): Promise<CollectionDto[]>;
  findById(workspaceId: string, collectionId: string): Promise<CollectionDto | null>;
  create(params: {
    workspaceId: string;
    name: string;
    description?: string;
    purpose: string;
    actorId: string;
  }): Promise<CollectionDto>;
  update(
    workspaceId: string,
    collectionId: string,
    data: {
      name?: string;
      description?: string | null;
      purpose?: string;
      status?: "ACTIVE" | "ARCHIVED";
    },
  ): Promise<CollectionDto | null>;
  softDelete(workspaceId: string, collectionId: string, actorId: string): Promise<boolean>;
}

function toCollectionDto(row: {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  purpose: string;
  status: CollectionStatus;
  _count?: { images: number };
  createdAt: Date;
  updatedAt: Date;
}): CollectionDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    purpose: row.purpose,
    status: row.status,
    imageCount: row._count?.images ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaCollectionsRepository implements CollectionsRepository {
  async list(workspaceId: string): Promise<CollectionDto[]> {
    const rows = await prisma.collection.findMany({
      where: { workspaceId, status: { not: "DELETED" } },
      include: { _count: { select: { images: { where: { deletedAt: null } } } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCollectionDto);
  }

  async findById(workspaceId: string, collectionId: string): Promise<CollectionDto | null> {
    const row = await prisma.collection.findFirst({
      where: { id: collectionId, workspaceId, status: { not: "DELETED" } },
      include: { _count: { select: { images: { where: { deletedAt: null } } } } },
    });
    return row ? toCollectionDto(row) : null;
  }

  async create(params: {
    workspaceId: string;
    name: string;
    description?: string;
    purpose: string;
    actorId: string;
  }): Promise<CollectionDto> {
    const created = await prisma.$transaction(async (tx) => {
      const col = await tx.collection.create({
        data: {
          workspaceId: params.workspaceId,
          name: params.name,
          description: params.description ?? null,
          purpose: params.purpose,
          status: "ACTIVE",
        },
        include: { _count: { select: { images: true } } },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: params.workspaceId,
          actorId: params.actorId,
          action: "COLLECTION_CREATED",
          resourceType: "Collection",
          resourceId: col.id,
          metadataJson: { name: col.name, purpose: col.purpose },
        },
      });
      return col;
    });
    return toCollectionDto(created);
  }

  async update(
    workspaceId: string,
    collectionId: string,
    data: {
      name?: string;
      description?: string | null;
      purpose?: string;
      status?: "ACTIVE" | "ARCHIVED";
    },
  ): Promise<CollectionDto | null> {
    const existing = await prisma.collection.findFirst({
      where: { id: collectionId, workspaceId, status: { not: "DELETED" } },
    });
    if (!existing) return null;
    const updated = await prisma.collection.update({
      where: { id: collectionId },
      data,
      include: { _count: { select: { images: { where: { deletedAt: null } } } } },
    });
    return toCollectionDto(updated);
  }

  async softDelete(workspaceId: string, collectionId: string, actorId: string): Promise<boolean> {
    const existing = await prisma.collection.findFirst({
      where: { id: collectionId, workspaceId, status: { not: "DELETED" } },
    });
    if (!existing) return false;
    await prisma.$transaction(async (tx) => {
      await tx.collection.update({
        where: { id: collectionId },
        data: { status: "DELETED" },
      });
      await tx.auditLog.create({
        data: {
          workspaceId,
          actorId,
          action: "COLLECTION_DELETED",
          resourceType: "Collection",
          resourceId: collectionId,
        },
      });
    });
    return true;
  }
}
