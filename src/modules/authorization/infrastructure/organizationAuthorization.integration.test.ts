import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createOrganizationAuthorizationGuard } from "@/modules/authorization/application/organizationAuthorizationGuard";
import { AuthorizationDeniedError, ORGANIZATION_PERMISSIONS, OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { createWorkflow } from "@/modules/workflows/application/createWorkflow";
import { listPersistedWorkflows } from "@/modules/workflows/application/listPersistedWorkflows";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { PrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("organization authorization with PostgreSQL", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const organizationId = `authz-org-${suffix}`;
  const otherOrganizationId = `authz-other-${suffix}`;
  const users = Object.fromEntries(["owner", "admin", "editor", "viewer", "outsider", "otherOwner"].map((role) => [role, `authz-${role}-${suffix}`]));
  const memberships = new PrismaMembershipRepository(prisma);
  const service = new OrganizationAuthorizationService();

  const guard = (userId: string, targetOrganizationId = organizationId) =>
    createOrganizationAuthorizationGuard(memberships, service, userId, targetOrganizationId);

  beforeAll(async () => {
    await prisma.user.createMany({ data: Object.values(users).map((id) => ({
      id, email: `${id}@test.invalid`, normalizedEmail: `${id}@test.invalid`, name: id,
    })) });
    await prisma.organization.createMany({ data: [
      { id: organizationId, name: "Authorization Org" },
      { id: otherOrganizationId, name: "Other Org" },
    ] });
    await prisma.organizationMembership.createMany({ data: [
      { organizationId, userId: users.owner, role: "OWNER" },
      { organizationId, userId: users.admin, role: "ADMIN" },
      { organizationId, userId: users.editor, role: "EDITOR" },
      { organizationId, userId: users.viewer, role: "VIEWER" },
      { organizationId: otherOrganizationId, userId: users.otherOwner, role: "OWNER" },
    ] });
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { workflowDefinition: { organizationId } } });
    await prisma.workflowDefinition.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: { in: [organizationId, otherOrganizationId] } } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(users) } } });
    await prisma.$disconnect();
  });

  it("autoriza OWNER, ADMIN, EDITOR e VIEWER conforme a matriz", async () => {
    await expect(guard(users.owner).require(ORGANIZATION_PERMISSIONS.membershipAdd)).resolves.toBeUndefined();
    await expect(guard(users.admin).require(ORGANIZATION_PERMISSIONS.membershipAdd)).resolves.toBeUndefined();
    await expect(guard(users.editor).require(ORGANIZATION_PERMISSIONS.workflowExecutionManage)).resolves.toBeUndefined();
    await expect(guard(users.editor).require(ORGANIZATION_PERMISSIONS.membershipAdd)).rejects.toBeInstanceOf(AuthorizationDeniedError);
    await expect(guard(users.viewer).require(ORGANIZATION_PERMISSIONS.workflowRead)).resolves.toBeUndefined();
    await expect(guard(users.viewer).require(ORGANIZATION_PERMISSIONS.workflowCreate)).rejects.toBeInstanceOf(AuthorizationDeniedError);
  });

  it("nega usuário sem membership e organização incorreta", async () => {
    await expect(guard(users.outsider).require(ORGANIZATION_PERMISSIONS.workflowRead)).rejects.toBeInstanceOf(OrganizationNotFoundError);
    await expect(guard(users.otherOwner).require(ORGANIZATION_PERMISSIONS.workflowRead)).rejects.toBeInstanceOf(OrganizationNotFoundError);
  });

  it("aplica autorização real aos casos de uso de workflow", async () => {
    const engine = createWorkflowEngine({
      clock: { now: () => new Date().toISOString() },
      idGenerator: {
        createWorkflowId: () => `authz-workflow-${suffix}`,
        createStepId: () => `authz-step-${suffix}`,
        createEventId: () => `authz-event-${crypto.randomUUID()}`,
      },
    });
    const editorDependencies = {
      workflowEngine: engine,
      workflowRepository: new PrismaWorkflowPersistenceRepository(organizationId, prisma, users.editor),
      authorization: guard(users.editor),
    };
    const viewerDependencies = {
      workflowEngine: engine,
      workflowRepository: new PrismaWorkflowPersistenceRepository(organizationId, prisma, users.viewer),
      authorization: guard(users.viewer),
    };

    await expect(createWorkflow(editorDependencies, { name: "Compartilhado", steps: [{ name: "Etapa", order: 1 }] })).resolves.toMatchObject({ name: "Compartilhado" });
    await expect(listPersistedWorkflows(viewerDependencies)).resolves.toHaveLength(1);
    await expect(createWorkflow(viewerDependencies, { name: "Negado", steps: [{ name: "Etapa", order: 1 }] })).rejects.toBeInstanceOf(AuthorizationDeniedError);
  });
});
