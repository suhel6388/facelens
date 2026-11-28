import type { CollectionDto } from "@app/types";
import type { CreateCollectionInput, UpdateCollectionInput } from "@app/validation";
import { AppError } from "../../middleware/error-handler.js";
import type { CollectionsRepository } from "./collections.repository.js";

export class CollectionsService {
  constructor(private readonly repo: CollectionsRepository) {}

  async list(workspaceId: string): Promise<CollectionDto[]> {
    return this.repo.list(workspaceId);
  }

  async getById(workspaceId: string, collectionId: string): Promise<CollectionDto> {
    const col = await this.repo.findById(workspaceId, collectionId);
    if (!col) {
      throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
    }
    return col;
  }

  async create(
    workspaceId: string,
    actorId: string,
    input: CreateCollectionInput,
  ): Promise<CollectionDto> {
    return this.repo.create({
      workspaceId,
      name: input.name,
      description: input.description,
      purpose: input.purpose,
      actorId,
    });
  }

  async update(
    workspaceId: string,
    collectionId: string,
    input: UpdateCollectionInput,
  ): Promise<CollectionDto> {
    const updated = await this.repo.update(workspaceId, collectionId, input);
    if (!updated) {
      throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
    }
    return updated;
  }

  async remove(workspaceId: string, collectionId: string, actorId: string): Promise<void> {
    const deleted = await this.repo.softDelete(workspaceId, collectionId, actorId);
    if (!deleted) {
      throw new AppError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
    }
  }
}
