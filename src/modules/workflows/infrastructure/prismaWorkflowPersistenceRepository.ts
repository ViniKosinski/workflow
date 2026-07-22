import { Prisma, PrismaClient } from "@prisma/client";
import type {
  ListWorkflowsParams,
  WorkflowPersistenceRepository,
} from "@/modules/workflows/domain/workflowPersistenceRepository";
import type { Workflow, WorkflowId } from "@/modules/workflows/domain/workflowEngine";
import {
  mapIsoDateToDate,
  mapJsonToPrismaInput,
  mapOptionalIsoDateToDate,
  mapWorkflowExecutionEventToPrisma,
  mapWorkflowRunListRecordToDomain,
  mapWorkflowRunToDomain,
  mapWorkflowStatusToPrisma,
  mapWorkflowStepStatusToPrisma,
  workflowRunInclude,
  workflowRunListInclude,
} from "@/modules/workflows/infrastructure/workflowPersistenceMapper";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

type PrismaTransaction = Prisma.TransactionClient;

export class PrismaWorkflowPersistenceRepository
  implements WorkflowPersistenceRepository
{
  constructor(
    private readonly ownerUserId: string,
    private readonly prisma: PrismaClient = prismaClient,
  ) {}

  async save(workflow: Workflow) {
    await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.workflowDefinition.findUnique({
        where: { id: workflow.id },
        select: { id: true },
      });
      if (existing) throw new Error("Workflow identifier already exists.");
      await this.persistWorkflow(transaction, workflow, "create");
    });

    const persistedWorkflow = await this.findById(workflow.id);

    if (!persistedWorkflow) {
      throw new Error("Workflow was not persisted.");
    }

    return persistedWorkflow;
  }

  async findById(workflowId: WorkflowId) {
    const workflowRun = await this.prisma.workflowRun.findFirst({
      where: {
        id: workflowId,
        workflowDefinition: { ownerUserId: this.ownerUserId },
      },
      include: workflowRunInclude,
    });

    return workflowRun ? mapWorkflowRunToDomain(workflowRun) : null;
  }

  async list(params: ListWorkflowsParams = {}) {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
    const offset = Math.max(params.offset ?? 0, 0);
    const workflowRuns = await this.prisma.workflowRun.findMany({
      where: {
        workflowDefinition: { ownerUserId: this.ownerUserId },
        status: params.status
          ? mapWorkflowStatusToPrisma(params.status)
          : undefined,
      },
      include: workflowRunListInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    return workflowRuns.map(mapWorkflowRunListRecordToDomain);
  }

  async update(workflow: Workflow) {
    await this.prisma.$transaction(async (transaction) => {
      const ownedWorkflow = await transaction.workflowRun.findFirst({
        where: {
          id: workflow.id,
          workflowDefinition: { ownerUserId: this.ownerUserId },
        },
        select: { id: true },
      });

      if (!ownedWorkflow) {
        throw new Error("Workflow was not found.");
      }

      await transaction.workflowRun.update({
        where: {
          id: workflow.id,
        },
        data: {
          currentStepId: null,
        },
      });

      await this.persistWorkflow(transaction, workflow, "update");
    });

    const persistedWorkflow = await this.findById(workflow.id);

    if (!persistedWorkflow) {
      throw new Error("Workflow was not found after update.");
    }

    return persistedWorkflow;
  }

  async exists(workflowId: WorkflowId) {
    const workflowRun = await this.prisma.workflowRun.findFirst({
      where: {
        id: workflowId,
        workflowDefinition: { ownerUserId: this.ownerUserId },
      },
      select: {
        id: true,
      },
    });

    return Boolean(workflowRun);
  }

  private async persistWorkflow(
    transaction: PrismaTransaction,
    workflow: Workflow,
    operation: "create" | "update",
  ) {
    if (operation === "create") {
      await transaction.workflowDefinition.create({
        data: {
          id: workflow.id,
          ownerUserId: this.ownerUserId,
          name: workflow.name,
          createdAt: mapIsoDateToDate(workflow.createdAt),
          updatedAt: mapIsoDateToDate(workflow.updatedAt),
        },
      });
    } else {
      const definitionUpdate = await transaction.workflowDefinition.updateMany({
        where: { id: workflow.id, ownerUserId: this.ownerUserId },
        data: {
          name: workflow.name,
          updatedAt: mapIsoDateToDate(workflow.updatedAt),
        },
      });
      if (definitionUpdate.count !== 1) throw new Error("Workflow was not found.");
    }

    const definitionSteps = workflow.steps.map((step) => ({
        id: step.id,
        workflowDefinitionId: workflow.id,
        name: step.name,
        order: step.order,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
    }));
    if (operation === "create") {
      await transaction.workflowDefinitionStep.createMany({ data: definitionSteps });
    } else {
      await transaction.workflowDefinitionStep.updateMany({
        where: { workflowDefinitionId: workflow.id },
        data: { order: { increment: 1_000 } },
      });
      for (const step of definitionSteps) {
        const updated = await transaction.workflowDefinitionStep.updateMany({
          where: { id: step.id, workflowDefinitionId: workflow.id },
          data: { name: step.name, order: step.order, updatedAt: step.updatedAt },
        });
        if (updated.count === 0) {
          const collision = await transaction.workflowDefinitionStep.findUnique({ where: { id: step.id }, select: { id: true } });
          if (collision) throw new Error("Workflow step identifier already exists.");
          await transaction.workflowDefinitionStep.create({ data: step });
        }
      }
      await transaction.workflowDefinitionStep.deleteMany({
        where: { workflowDefinitionId: workflow.id, id: { notIn: definitionSteps.map((step) => step.id) } },
      });
    }

    const runData = {
        id: workflow.id,
        workflowDefinitionId: workflow.id,
        status: mapWorkflowStatusToPrisma(workflow.status),
        currentStepId: null,
        startedAt: mapOptionalIsoDateToDate(workflow.startedAt),
        finishedAt: mapOptionalIsoDateToDate(workflow.finishedAt),
        failureReason: workflow.failureReason,
        cancellationReason: workflow.cancellationReason,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
    };

    if (operation === "create") {
      await transaction.workflowRun.create({ data: runData });
    } else {
      await transaction.workflowRun.update({
        where: { id: workflow.id },
        data: {
          status: runData.status,
          currentStepId: null,
          startedAt: runData.startedAt,
          finishedAt: runData.finishedAt,
          failureReason: runData.failureReason,
          cancellationReason: runData.cancellationReason,
          updatedAt: runData.updatedAt,
        },
      });
    }

    const runSteps = workflow.steps.map((step) => ({
        id: step.id,
        workflowRunId: workflow.id,
        workflowDefinitionStepId: step.id,
        name: step.name,
        order: step.order,
        status: mapWorkflowStepStatusToPrisma(step.status),
        executionResult: mapJsonToPrismaInput(step.executionResult),
        startedAt: mapOptionalIsoDateToDate(step.startedAt),
        finishedAt: mapOptionalIsoDateToDate(step.finishedAt),
        errorMessage: step.errorMessage,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
    }));
    if (operation === "create") {
      await transaction.workflowRunStep.createMany({ data: runSteps });
    } else {
      await transaction.workflowRunStep.updateMany({
        where: { workflowRunId: workflow.id },
        data: { order: { increment: 1_000 } },
      });
      for (const step of runSteps) {
        const updated = await transaction.workflowRunStep.updateMany({
          where: { id: step.id, workflowRunId: workflow.id },
          data: {
            workflowDefinitionStepId: step.workflowDefinitionStepId,
            name: step.name,
            order: step.order,
            status: step.status,
            executionResult: step.executionResult,
            startedAt: step.startedAt,
            finishedAt: step.finishedAt,
            errorMessage: step.errorMessage,
            updatedAt: step.updatedAt,
          },
        });
        if (updated.count === 0) {
          const collision = await transaction.workflowRunStep.findUnique({ where: { id: step.id }, select: { id: true } });
          if (collision) throw new Error("Workflow run step identifier already exists.");
          await transaction.workflowRunStep.create({ data: step });
        }
      }
      await transaction.workflowRunStep.deleteMany({
        where: { workflowRunId: workflow.id, id: { notIn: runSteps.map((step) => step.id) } },
      });
    }

    await transaction.workflowRun.update({
      where: {
        id: workflow.id,
      },
      data: {
        currentStepId: workflow.currentStepId,
      },
    });

    await transaction.workflowExecutionEvent.createMany({
      data: workflow.executionHistory.map((event) =>
        mapWorkflowExecutionEventToPrisma(workflow.id, event),
      ),
      skipDuplicates: true,
    });
  }
}

export function createPrismaWorkflowPersistenceRepository(ownerUserId: string) {
  return new PrismaWorkflowPersistenceRepository(ownerUserId);
}
