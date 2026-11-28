import crypto from "node:crypto";
import type { WorkspaceDetailDto, WorkspaceDto, WorkspaceMemberDto } from "@app/types";
import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  UpdateWorkspaceMemberInput,
} from "@app/validation";
import { AppError } from "../../middleware/error-handler.js";
import type { WorkspacesRepository } from "./workspaces.repository.js";

function slugifyWorkspace(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base || "workspace"}-${suffix}`;
}

export class WorkspacesService {
  constructor(private readonly repo: WorkspacesRepository) {}

  async listForUser(userId: string): Promise<WorkspaceDto[]> {
    return this.repo.listForUser(userId);
  }

  async createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<WorkspaceDto> {
    return this.repo.createWorkspace({
      userId,
      name: input.name,
      slug: slugifyWorkspace(input.name),
    });
  }

  async getDetail(workspaceId: string, userId: string): Promise<WorkspaceDetailDto> {
    const detail = await this.repo.findDetail(workspaceId, userId);
    if (!detail) {
      throw new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
    }
    return detail;
  }

  async updateWorkspace(
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ): Promise<WorkspaceDetailDto> {
    const updated = await this.repo.updateWorkspace(workspaceId, input);
    if (!updated) {
      throw new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
    }
    return updated;
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
    return this.repo.listMembers(workspaceId);
  }

  async addMember(
    workspaceId: string,
    input: AddWorkspaceMemberInput,
  ): Promise<WorkspaceMemberDto> {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "No user exists with that email address.");
    }
    const existing = await this.repo.findMemberByUser(workspaceId, user.id);
    if (existing) {
      throw new AppError(409, "MEMBER_EXISTS", "User is already a member of this workspace.");
    }
    return this.repo.addMember(workspaceId, user.id, input.role);
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    input: UpdateWorkspaceMemberInput,
  ): Promise<WorkspaceMemberDto> {
    const updated = await this.repo.updateMemberRole(workspaceId, memberId, input.role);
    if (!updated) {
      throw new AppError(404, "MEMBER_NOT_FOUND", "Workspace member not found.");
    }
    return updated;
  }

  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    const removed = await this.repo.removeMember(workspaceId, memberId);
    if (!removed) {
      throw new AppError(404, "MEMBER_NOT_FOUND", "Workspace member not found.");
    }
  }
}
