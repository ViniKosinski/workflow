import { TaskAuthorizationService } from "@/modules/tasks/domain/task";
import { PrismaTaskRepository } from "@/modules/tasks/infrastructure/prismaTaskRepository";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { createPrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";

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
    authorization: new TaskAuthorizationService(),
    workflowsFor: (organizationId: string) => ({
      engine: engine(),
      repository: createPrismaWorkflowPersistenceRepository(organizationId, actorUserId),
    }),
  };
}
