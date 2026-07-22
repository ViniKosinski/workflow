import { OrganizationRole as PrismaOrganizationRole, type Prisma, type PrismaClient } from "@prisma/client";
import type { OrganizationRole } from "@/modules/organizations/domain/membership";
import { MembershipDomainError } from "@/modules/organizations/domain/membership";
import type { MembershipRepository } from "@/modules/organizations/domain/membershipRepository";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

const TO_PRISMA: Readonly<Record<OrganizationRole, PrismaOrganizationRole>> = {
  owner: PrismaOrganizationRole.OWNER,
  admin: PrismaOrganizationRole.ADMIN,
  editor: PrismaOrganizationRole.EDITOR,
  viewer: PrismaOrganizationRole.VIEWER,
};

function mapRole(role: PrismaOrganizationRole): OrganizationRole {
  return role.toLowerCase() as OrganizationRole;
}

function mapMembership(record: {
  organizationId: string;
  userId: string;
  role: PrismaOrganizationRole;
  createdAt: Date;
  updatedAt: Date;
  user?: { email: string; name: string };
}) {
  return {
    organizationId: record.organizationId,
    userId: record.userId,
    role: mapRole(record.role),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    user: record.user,
  };
}

export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient = prismaClient) {}

  async find(organizationId: string, userId: string) {
    const record = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: { user: { select: { email: true, name: true } } },
    });
    return record ? mapMembership(record) : null;
  }

  async list(organizationId: string) {
    const records = await this.prisma.organizationMembership.findMany({
      where: { organizationId },
      include: { user: { select: { email: true, name: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
    return records.map(mapMembership);
  }

  async create(record: Parameters<MembershipRepository["create"]>[0]) {
    const activeUser = await this.prisma.user.findFirst({
      where: { id: record.userId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!activeUser) throw new MembershipDomainError("Não foi possível adicionar o usuário informado.");
    const created = await this.prisma.organizationMembership.create({
      data: {
        organizationId: record.organizationId,
        userId: record.userId,
        role: TO_PRISMA[record.role],
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
      include: { user: { select: { email: true, name: true } } },
    });
    return mapMembership(created);
  }

  async updateRole(organizationId: string, userId: string, role: OrganizationRole, updatedAt: string) {
    const updated = await this.prisma.organizationMembership.update({
      where: { organizationId_userId: { organizationId, userId } },
      data: { role: TO_PRISMA[role], updatedAt: new Date(updatedAt) },
      include: { user: { select: { email: true, name: true } } },
    });
    return mapMembership(updated);
  }

  async remove(organizationId: string, userId: string) {
    await this.prisma.organizationMembership.delete({
      where: { organizationId_userId: { organizationId, userId } },
    });
  }
}
