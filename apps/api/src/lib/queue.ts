import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import { logger } from "./logger.js";

export interface SearchJobPayload {
  searchId: string;
  workspaceId: string;
  collectionId: string;
  userId: string;
  queryStorageKey: string;
}

export type SearchJobProcessor = (payload: SearchJobPayload) => Promise<void>;

export interface SearchQueueAdapter {
  enqueueSearch(payload: SearchJobPayload): Promise<void>;
  cancelSearch(searchId: string): Promise<void>;
  registerProcessor(processor: SearchJobProcessor): void;
  close(): Promise<void>;
}

/**
 * BullMQ + Redis backed search queue with exponential backoff retries.
 */
export class BullMqSearchQueue implements SearchQueueAdapter {
  private readonly connection: Redis;
  private readonly queue: Queue<SearchJobPayload>;
  private worker: Worker<SearchJobPayload> | null = null;

  constructor(redisUrl: string) {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue<SearchJobPayload>("facelens-searches", {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }

  async enqueueSearch(payload: SearchJobPayload): Promise<void> {
    await this.queue.add("process-search", payload, { jobId: payload.searchId });
  }

  async cancelSearch(searchId: string): Promise<void> {
    const job = await this.queue.getJob(searchId);
    if (job) {
      await job.remove().catch(() => undefined);
    }
  }

  registerProcessor(processor: SearchJobProcessor): void {
    this.worker = new Worker<SearchJobPayload>(
      "facelens-searches",
      async (job: Job<SearchJobPayload>) => {
        await processor(job.data);
      },
      { connection: this.connection },
    );

    this.worker.on("failed", (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, "Search worker job failed");
    });
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
    await this.connection.quit();
  }
}

/**
 * In-memory queue adapter for unit tests and local development without Redis.
 */
export class InMemorySearchQueue implements SearchQueueAdapter {
  private processor: SearchJobProcessor | null = null;
  private readonly cancelled = new Set<string>();

  registerProcessor(processor: SearchJobProcessor): void {
    this.processor = processor;
  }

  async enqueueSearch(payload: SearchJobPayload): Promise<void> {
    if (!this.processor) return;
    queueMicrotask(() => {
      if (this.cancelled.has(payload.searchId)) return;
      void this.processor?.(payload).catch((err) => {
        logger.error({ searchId: payload.searchId, err }, "In-memory search worker failed");
      });
    });
  }

  async cancelSearch(searchId: string): Promise<void> {
    this.cancelled.add(searchId);
  }

  async close(): Promise<void> {
    // No-op
  }
}
