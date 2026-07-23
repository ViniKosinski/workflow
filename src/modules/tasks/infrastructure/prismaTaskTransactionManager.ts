import { Prisma, type PrismaClient } from "@prisma/client";
import type { TaskTransactionManager } from "@/modules/tasks/domain/taskTransaction";
import { PrismaTaskRepository } from "@/modules/tasks/infrastructure/prismaTaskRepository";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { WorkflowConcurrencyError } from "@/modules/workflows/domain/workflowPersistenceRepository";
import { PrismaWorkflowRunRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowRunRepository";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

export class PrismaTaskTransactionManager implements TaskTransactionManager {
  constructor(private readonly actorUserId: string, private readonly prisma: PrismaClient = prismaClient) {}

  async run<T>(work: Parameters<TaskTransactionManager["run"]>[0]) {
    try {
      return await this.prisma.$transaction(async (transaction) => work({
        tasks: new PrismaTaskRepository(transaction),
        workflow: (organizationId) => ({
          engine: createWorkflowEngine({
            clock: { now: () => new Date().toISOString() },
            idGenerator: {
              createWorkflowId: () => crypto.randomUUID(),
              createStepId: () => crypto.randomUUID(),
              createEventId: () => crypto.randomUUID(),
            },
          }),
          repository: new PrismaWorkflowRunRepository(organizationId, transaction),
        }),
      }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) as T;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new WorkflowConcurrencyError("task-transaction");
      }
      throw error;
    }
  }
}
