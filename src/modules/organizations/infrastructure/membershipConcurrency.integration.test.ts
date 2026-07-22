import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { MembershipConcurrencyError } from "@/modules/organizations/domain/membershipTransaction";
import { MembershipDomainError } from "@/modules/organizations/domain/membership";
import { PrismaMembershipTransactionManager } from "@/modules/organizations/infrastructure/prismaMembershipTransactionManager";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("membership serializable concurrency", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const organizationId = `member-concurrency-${suffix}`;
  const ownerId = `member-owner-${suffix}`;
  const targetId = `member-target-${suffix}`;
  const disabledId = `member-disabled-${suffix}`;
  const transactions = new PrismaMembershipTransactionManager(prisma);

  beforeAll(async () => {
    await prisma.user.createMany({ data: [ownerId, targetId, disabledId].map((id) => ({ id, email: `${id}@test.invalid`, normalizedEmail: `${id}@test.invalid`, name: id, status: id === disabledId ? "DISABLED" : "ACTIVE" })) });
    await prisma.organization.create({ data: { id: organizationId, name: "Membership concurrency" } });
    await prisma.organizationMembership.createMany({ data: [
      { organizationId, userId: ownerId, role: "OWNER" },
      { organizationId, userId: targetId, role: "EDITOR" },
    ] });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, targetId, disabledId] } } });
    await prisma.$disconnect();
  });

  it("rejeita uma das alterações concorrentes em estado obsoleto", async () => {
    let readers = 0;
    let release!: () => void;
    const bothRead = new Promise<void>((resolve) => { release = resolve; });
    const change = (role: "admin" | "viewer") => transactions.run(async (memberships) => {
      const target = await memberships.find(organizationId, targetId);
      expect(target?.role).toBe("editor");
      readers += 1;
      if (readers === 2) release();
      await bothRead;
      return memberships.updateRole(organizationId, targetId, role, new Date().toISOString());
    });

    const results = await Promise.allSettled([change("admin"), change("viewer")]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(MembershipConcurrencyError);
  });

  it("revalida status ACTIVE dentro da transação", async () => {
    const now = new Date().toISOString();
    await expect(transactions.run((memberships) => memberships.create({ organizationId, userId: disabledId, role: "viewer", createdAt: now, updatedAt: now })))
      .rejects.toBeInstanceOf(MembershipDomainError);
    await expect(prisma.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId, userId: disabledId } } })).resolves.toBeNull();
  });
});
