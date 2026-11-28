import type { UserDto } from "@app/types";
import type { UpdateProfileInput } from "@app/validation";
import { AppError } from "../../middleware/error-handler.js";
import type { UsersRepository } from "./users.repository.js";

export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async getProfile(userId: string): Promise<UserDto> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User account not found.");
    }
    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDto> {
    const updated = await this.repo.updateName(userId, input.name);
    if (!updated) {
      throw new AppError(404, "USER_NOT_FOUND", "User account not found.");
    }
    return updated;
  }

  async deleteAccount(userId: string): Promise<void> {
    const deleted = await this.repo.deleteUser(userId);
    if (!deleted) {
      throw new AppError(404, "USER_NOT_FOUND", "User account not found.");
    }
  }
}
