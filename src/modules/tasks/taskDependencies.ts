import { TaskAuthorizationService } from "@/modules/tasks/domain/task";
import { PrismaTaskRepository } from "@/modules/tasks/infrastructure/prismaTaskRepository";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { createPrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";
import { PrismaTaskTransactionManager } from "@/modules/tasks/infrastructure/prismaTaskTransactionManager";
import { WorkflowFormService } from "@/modules/workflowDefinitions/domain/workflowForm";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";

function engine() {
  return createWorkflowEngine({
    clock: { now: () => new Date().toISOString() },
    idGenerator: {
      createWorkflowId: () => crypto.randomUUID(),
      createStepId: () => crypto.randomUUID(),
      createEventId: () => crypto.randomUUID(),
    },
  });
}

export function createTaskDependencies(actorUserId: string) {
  return {
    tasks: new PrismaTaskRepository(),
    memberships: new PrismaMembershipRepository(),
    organizationAuthorization: new OrganizationAuthorizationService(),
    authorization: new TaskAuthorizationService(),
    transactions: new PrismaTaskTransactionManager(actorUserId),
    forms: new WorkflowFormService(),
    workflowsFor: (organizationId: string) => ({
      engine: engine(),
      repository: createPrismaWorkflowPersistenceRepository(organizationId, actorUserId),
    }),
  };
}
