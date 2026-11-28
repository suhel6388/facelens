import { env } from "../config/env.js";

export interface AiSearchCandidate {
  collectionImageId: string;
  similarityEstimate: number;
  rank: number;
}

export interface AiServiceClient {
  searchCollection(params: {
    workspaceId: string;
    collectionId: string;
    queryBase64: string;
    topK?: number;
  }): Promise<AiSearchCandidate[]>;
  deleteCollectionIndex(workspaceId: string, collectionId: string): Promise<void>;
  deleteImageFromIndex(workspaceId: string, collectionId: string, imageId: string): Promise<void>;
}

export class HttpAiServiceClient implements AiServiceClient {
  constructor(private readonly baseUrl = env.aiServiceUrl) {}

  async searchCollection(params: {
    workspaceId: string;
    collectionId: string;
    queryBase64: string;
    topK?: number;
  }): Promise<AiSearchCandidate[]> {
    const res = await fetch(`${this.baseUrl}/v1/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: params.workspaceId,
        collection_id: params.collectionId,
        query_b64: params.queryBase64,
        top_k: params.topK ?? 10,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`AI_SERVICE_ERROR_${res.status}`);
    }

    const body = (await res.json()) as {
      results: { collection_image_id: string; similarity_estimate: number; rank: number }[];
    };

    return body.results.map((r) => ({
      collectionImageId: r.collection_image_id,
      similarityEstimate: r.similarity_estimate,
      rank: r.rank,
    }));
  }

  async deleteCollectionIndex(workspaceId: string, collectionId: string): Promise<void> {
    await fetch(`${this.baseUrl}/v1/indexes/${workspaceId}/collections/${collectionId}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(5000),
    }).catch(() => undefined);
  }

  async deleteImageFromIndex(
    workspaceId: string,
    collectionId: string,
    imageId: string,
  ): Promise<void> {
    await fetch(
      `${this.baseUrl}/v1/indexes/${workspaceId}/collections/${collectionId}/images/${imageId}`,
      {
        method: "DELETE",
        signal: AbortSignal.timeout(5000),
      },
    ).catch(() => undefined);
  }
}
