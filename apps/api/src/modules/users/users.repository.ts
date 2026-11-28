import { prisma } from "@app/database";
import type { UserDto, UserRole } from "@app/types";

export interface UsersRepository {
  findById(userId: string): Promise<UserDto | null>;
  updateName(userId: string, name: string): Promise<UserDto | null>;
  deleteUser(userId: string): Promise<boolean>;
}

function toUserDto(row: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}): UserDto {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    emailVerifiedAt: row.emailVerifiedAt ? row.emailVerifiedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class PrismaUsersRepository implements UsersRepository {
  async findById(userId: string): Promise<UserDto | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? toUserDto(user) : null;
  }

  async updateName(userId: string, name: string): Promise<UserDto | null> {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return null;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    return toUserDto(updated);
  }

  async deleteUser(userId: string): Promise<boolean> {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) return false;
    await prisma.user.delete({ where: { id: userId } });
    return true;
  }
}
