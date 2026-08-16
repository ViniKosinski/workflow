import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { AuthorizationDeniedError } from "@/modules/authorization/domain/authorization";
import { teamService } from "@/modules/teams/application/teamService";
import { TeamError } from "@/modules/teams/domain/team";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("organization teams", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID(); const organizationId = `team-org-${suffix}`; const otherOrganizationId = `team-other-${suffix}`;
  const ownerId = `team-owner-${suffix}`; const editorId = `team-editor-${suffix}`; const outsiderId = `team-outsider-${suffix}`;
  beforeAll(async () => {
    await prisma.user.createMany({ data: [ownerId, editorId, outsiderId].map((id) => ({ id, email: `${id}@test.invalid`, normalizedEmail: `${id}@test.invalid`, name: id })) });
    await prisma.organization.createMany({ data: [{ id: organizationId, name: "Empresa" }, { id: otherOrganizationId, name: "Outra" }] });
    await prisma.organizationMembership.createMany({ data: [{ organizationId, userId: ownerId, role: "OWNER" }, { organizationId, userId: editorId, role: "EDITOR" }, { organizationId: otherOrganizationId, userId: outsiderId, role: "OWNER" }] });
  });
  afterAll(async () => { await prisma.organization.deleteMany({ where: { id: { in: [organizationId, otherOrganizationId] } } }); await prisma.user.deleteMany({ where: { id: { in: [ownerId, editorId, outsiderId] } } }); await prisma.$disconnect(); });

  it("permite ao owner criar setor e incluir somente membro da empresa", async () => {
    const team = await teamService.create(ownerId, organizationId, "Financeiro");
    const updated = await teamService.addMember(ownerId, organizationId, team.id, editorId, "manager");
    expect(updated).toMatchObject({ name: "Financeiro", members: [{ userId: editorId, role: "manager" }] });
    await expect(teamService.addMember(ownerId, organizationId, team.id, outsiderId, "member")).rejects.toThrow(TeamError);
  });

  it("isola equipes entre empresas e impede editor de administrá-las", async () => {
    await expect(teamService.list(outsiderId, organizationId)).rejects.toThrow(TeamError);
    await expect(teamService.create(editorId, organizationId, "Comercial")).rejects.toThrow(AuthorizationDeniedError);
  });
});
