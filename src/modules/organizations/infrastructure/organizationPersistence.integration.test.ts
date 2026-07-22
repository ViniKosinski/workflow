import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("organization persistence with PostgreSQL", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const ownerId = `org-owner-${crypto.randomUUID()}`;
  const memberId = `org-member-${crypto.randomUUID()}`;
  const organizationId = `org-${crypto.randomUUID()}`;
  let organizations: import("@/modules/organizations/domain/organizationRepository").OrganizationRepository;
  let memberships: import("@/modules/organizations/domain/membershipRepository").MembershipRepository;

  beforeAll(async () => {
    const { PrismaOrganizationRepository } = await import("@/modules/organizations/infrastructure/prismaOrganizationRepository");
    const { PrismaMembershipRepository } = await import("@/modules/organizations/infrastructure/prismaMembershipRepository");
    organizations = new PrismaOrganizationRepository(prisma);
    memberships = new PrismaMembershipRepository(prisma);
    await prisma.user.createMany({ data: [
      { id: ownerId, email: `${ownerId}@test.invalid`, normalizedEmail: `${ownerId}@test.invalid`, name: "Owner" },
      { id: memberId, email: `${memberId}@test.invalid`, normalizedEmail: `${memberId}@test.invalid`, name: "Member" },
    ] });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, memberId] } } });
    await prisma.$disconnect();
  });

  it("cria organização com OWNER e gerencia membership", async () => {
    const now = new Date().toISOString();
    await organizations.createWithOwner({
      organization: { id: organizationId, name: "Org integração", createdAt: now, updatedAt: now },
      ownerMembership: { organizationId, userId: ownerId, role: "owner", createdAt: now, updatedAt: now },
    });
    await memberships.create({ organizationId, userId: memberId, role: "viewer", createdAt: now, updatedAt: now });
    await expect(organizations.listByUserId(memberId)).resolves.toEqual([expect.objectContaining({ id: organizationId })]);
    await expect(memberships.list(organizationId)).resolves.toHaveLength(2);
    await expect(memberships.updateRole(organizationId, memberId, "editor", now)).resolves.toMatchObject({ role: "editor" });
    await memberships.remove(organizationId, memberId);
    await expect(memberships.find(organizationId, memberId)).resolves.toBeNull();
  });
});
