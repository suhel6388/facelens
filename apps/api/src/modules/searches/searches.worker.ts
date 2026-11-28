import { logger } from "../../lib/logger.js";
import type { AiServiceClient } from "../../lib/ai-client.js";
import type { SearchJobPayload } from "../../lib/queue.js";
import type { PrivateStorageAdapter } from "../../lib/storage.js";
import type { SearchesRepository } from "./searches.repository.js";

export class SearchesWorker {
  constructor(
    private readonly repo: SearchesRepository,
    private readonly aiClient: AiServiceClient,
    private readonly storage: PrivateStorageAdapter,
  ) {}

  async process(payload: SearchJobPayload): Promise<void> {
    const current = await this.repo.findByIdWithResults(payload.workspaceId, payload.searchId);
    if (!current) return;
    if (current.search.status === "CANCELLED" || current.search.status === "DELETED") {
      return;
    }

    try {
      await this.repo.updateStatus(payload.searchId, "VALIDATING");

      const info = await this.repo.getWorkspaceRetentionAndCollection(
        payload.workspaceId,
        payload.collectionId,
      );
      if (!info || !info.collectionActive || info.consentedImageCount === 0) {
        await this.repo.updateStatus(payload.searchId, "FAILED", "COLLECTION_NOT_READY");
        return;
      }

      await this.repo.updateStatus(payload.searchId, "PROCESSING");

      const queryBuffer = await this.storage.getObject(payload.queryStorageKey);
      const queryBase64 = queryBuffer ? queryBuffer.toString("base64") : "";

      let results: { collectionImageId: string; similarityEstimate: number; rank: number }[] = [];
      if (queryBase64.length > 0) {
        results = await this.aiClient.searchCollection({
          workspaceId: payload.workspaceId,
          collectionId: payload.collectionId,
          queryBase64,
        });
      }

      await this.repo.saveResults(payload.searchId, payload.workspaceId, results);
    } catch (err) {
      logger.error({ searchId: payload.searchId, err }, "Search processing failed");
      await this.repo.updateStatus(payload.searchId, "FAILED", "AI_PROCESSING_FAILED");
      throw err;
    }
  }
}
