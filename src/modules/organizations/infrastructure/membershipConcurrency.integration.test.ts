import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { MembershipConcurrencyError } from "@/modules/organizations/domain/membershipTransaction";
import { PrismaMembershipTransactionManager } from "@/modules/organizations/infrastructure/prismaMembershipTransactionManager";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("membership serializable concurrency", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const organizationId = `member-concurrency-${suffix}`;
  const ownerId = `member-owner-${suffix}`;
  const targetId = `member-target-${suffix}`;
  const transactions = new PrismaMembershipTransactionManager(prisma);

  beforeAll(async () => {
    await prisma.user.createMany({ data: [ownerId, targetId].map((id) => ({ id, email: `${id}@test.invalid`, normalizedEmail: `${id}@test.invalid`, name: id })) });
    await prisma.organization.create({ data: { id: organizationId, name: "Membership concurrency" } });
    await prisma.organizationMembership.createMany({ data: [
      { organizationId, userId: ownerId, role: "OWNER" },
      { organizationId, userId: targetId, role: "EDITOR" },
    ] });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, targetId] } } });
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
});
