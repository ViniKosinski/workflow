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
  mapWorkflowRunToDomain,
  mapWorkflowStatusToPrisma,
  mapWorkflowStepStatusToPrisma,
  workflowRunInclude,
} from "@/modules/workflows/infrastructure/workflowPersistenceMapper";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

type PrismaTransaction = Prisma.TransactionClient;

export class PrismaWorkflowPersistenceRepository
  implements WorkflowPersistenceRepository
{
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async save(workflow: Workflow) {
    await this.prisma.$transaction(async (transaction) => {
      await this.persistWorkflow(transaction, workflow);
    });

    const persistedWorkflow = await this.findById(workflow.id);

    if (!persistedWorkflow) {
      throw new Error("Workflow was not persisted.");
    }

    return persistedWorkflow;
  }

  async findById(workflowId: WorkflowId) {
    const workflowRun = await this.prisma.workflowRun.findUnique({
      where: {
        id: workflowId,
      },
      include: workflowRunInclude,
    });

    return workflowRun ? mapWorkflowRunToDomain(workflowRun) : null;
  }

  async list(params: ListWorkflowsParams = {}) {
    const workflowRuns = await this.prisma.workflowRun.findMany({
      where: {
        status: params.status
          ? mapWorkflowStatusToPrisma(params.status)
          : undefined,
      },
      include: workflowRunInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: params.limit,
      skip: params.offset,
    });

    return workflowRuns.map(mapWorkflowRunToDomain);
  }

  async update(workflow: Workflow) {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.workflowRun.update({
        where: {
          id: workflow.id,
        },
        data: {
          currentStepId: null,
        },
      });

      await transaction.workflowExecutionEvent.deleteMany({
        where: {
          workflowRunId: workflow.id,
        },
      });

      await transaction.workflowRunStep.deleteMany({
        where: {
          workflowRunId: workflow.id,
        },
      });

      await transaction.workflowDefinitionStep.deleteMany({
        where: {
          workflowDefinitionId: workflow.id,
        },
      });

      await this.persistWorkflow(transaction, workflow);
    });

    const persistedWorkflow = await this.findById(workflow.id);

    if (!persistedWorkflow) {
      throw new Error("Workflow was not found after update.");
    }

    return persistedWorkflow;
  }

  async exists(workflowId: WorkflowId) {
    const workflowRun = await this.prisma.workflowRun.findUnique({
      where: {
        id: workflowId,
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
  ) {
    await transaction.workflowDefinition.upsert({
      where: {
        id: workflow.id,
      },
      create: {
        id: workflow.id,
        name: workflow.name,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      },
      update: {
        name: workflow.name,
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      },
    });

    await transaction.workflowDefinitionStep.createMany({
      data: workflow.steps.map((step) => ({
        id: step.id,
        workflowDefinitionId: workflow.id,
        name: step.name,
        order: step.order,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      })),
    });

    await transaction.workflowRun.upsert({
      where: {
        id: workflow.id,
      },
      create: {
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
      },
      update: {
        workflowDefinitionId: workflow.id,
        status: mapWorkflowStatusToPrisma(workflow.status),
        currentStepId: null,
        startedAt: mapOptionalIsoDateToDate(workflow.startedAt),
        finishedAt: mapOptionalIsoDateToDate(workflow.finishedAt),
        failureReason: workflow.failureReason,
        cancellationReason: workflow.cancellationReason,
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      },
    });

    await transaction.workflowRunStep.createMany({
      data: workflow.steps.map((step) => ({
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
      })),
    });

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
    });
  }
}

export const prismaWorkflowPersistenceRepository =
  new PrismaWorkflowPersistenceRepository();
