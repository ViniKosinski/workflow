import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { createPrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";

export function createWorkflowPersistenceDependencies(ownerUserId: string) {
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
    workflowRepository: createPrismaWorkflowPersistenceRepository(ownerUserId),
  };
}
