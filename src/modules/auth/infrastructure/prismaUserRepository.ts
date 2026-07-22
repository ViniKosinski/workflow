import { PrismaClient, UserStatus as PrismaUserStatus } from "@prisma/client";
import type { CreateUserRecord, UserRepository } from "@/modules/auth/domain/userRepository";
import type { User, UserStatus } from "@/modules/auth/domain/user";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

function mapStatus(status: PrismaUserStatus): UserStatus {
  return status === PrismaUserStatus.ACTIVE ? "active" : "disabled";
}

function mapUser(user: {
  id: string; email: string; name: string; status: PrismaUserStatus; createdAt: Date; updatedAt: Date;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: mapStatus(user.status),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async create(record: CreateUserRecord) {
    const user = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          id: record.id,
          email: record.email,
          normalizedEmail: record.normalizedEmail,
          name: record.name,
          status: record.status === "active" ? PrismaUserStatus.ACTIVE : PrismaUserStatus.DISABLED,
          createdAt: new Date(record.now),
          updatedAt: new Date(record.now),
        },
      });
      await transaction.userCredential.create({
        data: {
          userId: record.id,
          passwordHash: record.passwordHash,
          passwordChangedAt: new Date(record.now),
          createdAt: new Date(record.now),
          updatedAt: new Date(record.now),
        },
      });
      return created;
    });
    return mapUser(user);
  }

  async findByNormalizedEmail(normalizedEmail: string) {
    const user = await this.prisma.user.findUnique({
      where: { normalizedEmail },
      include: { credential: true },
    });
    if (!user?.credential) return null;
    return { user: mapUser(user), passwordHash: user.credential.passwordHash };
  }

  async findCredentialByUserId(userId: string) {
    const credential = await this.prisma.userCredential.findUnique({ where: { userId } });
    return credential?.passwordHash ?? null;
  }

  async updateName(userId: string, name: string, now: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name, updatedAt: new Date(now) },
    });
    return mapUser(user);
  }

  async updatePasswordAndRevokeSessions(userId: string, passwordHash: string, now: string) {
    await this.prisma.$transaction([
      this.prisma.userCredential.update({
        where: { userId },
        data: { passwordHash, passwordChangedAt: new Date(now), updatedAt: new Date(now) },
      }),
      this.prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(now) },
      }),
    ]);
  }
}
