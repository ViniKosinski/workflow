import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { prismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";

export const workflowPersistenceDependencies = {
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
  workflowRepository: prismaWorkflowPersistenceRepository,
};
