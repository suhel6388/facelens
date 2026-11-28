import type { ConsentRecordDto } from "@app/types";
import type { WithdrawConsentInput } from "@app/validation";
import { AppError } from "../../middleware/error-handler.js";
import type { ConsentRepository } from "./consent.repository.js";

export class ConsentService {
  constructor(private readonly repo: ConsentRepository) {}

  async listByWorkspace(workspaceId: string): Promise<ConsentRecordDto[]> {
    return this.repo.listByWorkspace(workspaceId);
  }

  async listByCollection(workspaceId: string, collectionId: string): Promise<ConsentRecordDto[]> {
    return this.repo.listByCollection(workspaceId, collectionId);
  }

  async listByImage(workspaceId: string, imageId: string): Promise<ConsentRecordDto[]> {
    return this.repo.listByImage(workspaceId, imageId);
  }

  async withdraw(
    workspaceId: string,
    imageId: string,
    actorId: string,
    input: WithdrawConsentInput,
  ): Promise<ConsentRecordDto> {
    const updated = await this.repo.withdrawConsent({
      workspaceId,
      imageId,
      actorId,
      reason: input.reason,
    });
    if (!updated) {
      throw new AppError(
        404,
        "CONSENT_RECORD_NOT_FOUND",
        "Active collection image or consent record not found.",
      );
    }
    return updated;
  }
}
