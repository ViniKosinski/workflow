import { UserStatus as PrismaUserStatus, type PrismaClient } from "@prisma/client";
import type { AccountProvisioningRepository } from "@/modules/accountProvisioning/domain/accountProvisioningRepository";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

export class PrismaAccountProvisioningRepository implements AccountProvisioningRepository {
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async provision(record: Parameters<AccountProvisioningRepository["provision"]>[0]) {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.create({
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
      await transaction.organization.create({
        data: {
          id: record.id,
          name: `${record.name} - Espaço pessoal`.slice(0, 160),
          createdAt: new Date(record.now),
          updatedAt: new Date(record.now),
        },
      });
      await transaction.organizationMembership.create({
        data: {
          organizationId: record.id,
          userId: record.id,
          role: "OWNER",
          createdAt: new Date(record.now),
          updatedAt: new Date(record.now),
        },
      });
    });
  }
}
