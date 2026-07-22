import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { createPrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";
import { createOrganizationAuthorizationGuard } from "@/modules/authorization/application/organizationAuthorizationGuard";
import { OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";

export function createWorkflowPersistenceDependencies(actorUserId: string, organizationId = actorUserId) {
  return {
    workflowEngine: createWorkflowEngine({
      clock: {
        now: () => new Date().toISOString(),
      },
      idGenerator: {
        createWorkflowId: () => crypto.randomUUID(),
        createStepId: () => crypto.randomUUID(),
        createEventId: () => crypto.randomUUID(),
      },
    }),
    workflowRepository: createPrismaWorkflowPersistenceRepository(organizationId, actorUserId),
    authorization: createOrganizationAuthorizationGuard(
      new PrismaMembershipRepository(),
      new OrganizationAuthorizationService(),
      actorUserId,
      organizationId,
    ),
  };
}
