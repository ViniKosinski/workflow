import type { PrismaClient } from "@prisma/client";
import type { OrganizationRepository } from "@/modules/organizations/domain/organizationRepository";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

function mapOrganization(record: { id: string; name: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async createWithOwner(record: Parameters<OrganizationRepository["createWithOwner"]>[0]) {
    const created = await this.prisma.$transaction(async (transaction) => {
      const organization = await transaction.organization.create({
        data: {
          id: record.organization.id,
          name: record.organization.name,
          createdAt: new Date(record.organization.createdAt),
          updatedAt: new Date(record.organization.updatedAt),
        },
      });
      await transaction.organizationMembership.create({
        data: {
          organizationId: record.ownerMembership.organizationId,
          userId: record.ownerMembership.userId,
          role: "OWNER",
          createdAt: new Date(record.ownerMembership.createdAt),
          updatedAt: new Date(record.ownerMembership.updatedAt),
        },
      });
      return organization;
    });
    return mapOrganization(created);
  }

  async findById(organizationId: string) {
    const record = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    return record ? mapOrganization(record) : null;
  }

  async listByUserId(userId: string) {
    const records = await this.prisma.organization.findMany({
      where: { memberships: { some: { userId, user: { status: "ACTIVE" } } } },
      orderBy: { createdAt: "asc" },
    });
    return records.map(mapOrganization);
  }
}
