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
  mapWorkflowStatusToPrisma,
  mapWorkflowStepStatusToPrisma,
} from "@/modules/workflows/infrastructure/workflowPersistenceMapper";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";
import { PrismaWorkflowRunRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowRunRepository";
import { WorkflowConcurrencyError } from "@/modules/workflows/domain/workflowPersistenceRepository";

type PrismaTransaction = Prisma.TransactionClient;

export class PrismaWorkflowPersistenceRepository
  implements WorkflowPersistenceRepository
{
  constructor(
    private readonly organizationId: string,
    private readonly prisma: PrismaClient | Prisma.TransactionClient = prismaClient,
    private readonly createdByUserId: string = organizationId,
  ) {}

  async save(workflow: Workflow) {
    await this.inTransaction(async (transaction) => {
      const existing = await transaction.workflowDefinition.findUnique({
        where: { id: workflow.id },
        select: { id: true },
      });
      if (existing) throw new Error("Workflow identifier already exists.");
      await this.persistWorkflow(transaction, workflow);
    });

    const persistedWorkflow = await this.findById(workflow.id);

    if (!persistedWorkflow) {
      throw new Error("Workflow was not persisted.");
    }

    return persistedWorkflow;
  }

  async findById(workflowId: WorkflowId) {
    return new PrismaWorkflowRunRepository(this.organizationId, this.prisma).findById(workflowId);
  }

  async list(params: ListWorkflowsParams = {}) {
    return new PrismaWorkflowRunRepository(this.organizationId, this.prisma).list(params);
  }

  async update(workflow: Workflow) {
    if (workflow.status === "draft") {
      await this.inTransaction((transaction) => this.updateLegacyDraft(transaction, workflow));
      return (await this.findById(workflow.id))!;
    }
    return new PrismaWorkflowRunRepository(this.organizationId, this.prisma).update(workflow);
  }

  async exists(workflowId: WorkflowId) {
    return new PrismaWorkflowRunRepository(this.organizationId, this.prisma).exists(workflowId);
  }

  private async persistWorkflow(
    transaction: PrismaTransaction,
    workflow: Workflow,
  ) {
    await transaction.workflowDefinition.create({
        data: {
          id: workflow.id,
          organizationId: this.organizationId,
          createdByUserId: this.createdByUserId,
          definitionKey: workflow.id,
          name: workflow.name,
          version: 1,
          createdAt: mapIsoDateToDate(workflow.createdAt),
          updatedAt: mapIsoDateToDate(workflow.updatedAt),
        },
      });

    const definitionSteps = workflow.steps.map((step) => ({
        id: step.id,
        workflowDefinitionId: workflow.id,
        name: step.name,
        order: step.order,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
        assigneeType: step.assignee.type === "role" ? "ROLE" as const : "USER" as const,
        assigneeUserId: step.assignee.type === "user" ? step.assignee.userId : null,
        assigneeRole: step.assignee.type === "role" ? step.assignee.role.toUpperCase() as "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" : null,
        priority: "NORMAL" as const,
    }));
    await transaction.workflowDefinitionStep.createMany({ data: definitionSteps });

    await transaction.workflowDefinitionTransition.createMany({
      data: workflow.steps.flatMap((step) => step.transitions.map((transition) => ({
        id: transition.id,
        sourceStepId: step.id,
        targetStepId: transition.targetStepId,
        name: transition.name,
        description: transition.description,
        result: transition.result,
        endsWorkflow: transition.endsWorkflow,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      }))),
    });

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

    await transaction.workflowRun.create({ data: runData });

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
        assigneeType: step.assignee.type === "role" ? "ROLE" as const : "USER" as const,
        assigneeUserId: step.assignee.type === "user" ? step.assignee.userId : null,
        assigneeRole: step.assignee.type === "role" ? step.assignee.role.toUpperCase() as "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" : null,
        priority: "NORMAL" as const,
    }));
    await transaction.workflowRunStep.createMany({ data: runSteps });

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

  private async updateLegacyDraft(transaction: PrismaTransaction, workflow: Workflow) {
    const owned = await transaction.workflowRun.findFirst({
      where: {
        id: workflow.id,
        workflowDefinition: { organizationId: this.organizationId },
      },
      select: { id: true },
    });
    if (!owned) throw new Error("Workflow was not found.");

    const runUpdate = await transaction.workflowRun.updateMany({
      where: { id: workflow.id, version: workflow.version },
      data: { version: { increment: 1 }, updatedAt: mapIsoDateToDate(workflow.updatedAt) },
    });
    if (runUpdate.count !== 1) throw new WorkflowConcurrencyError(workflow.id);

    const definitionUpdate = await transaction.workflowDefinition.updateMany({
      where: {
        id: workflow.id,
        organizationId: this.organizationId,
        version: workflow.version,
        status: "DRAFT",
      },
      data: {
        name: workflow.name,
        version: { increment: 1 },
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      },
    });
    if (definitionUpdate.count !== 1) throw new WorkflowConcurrencyError(workflow.id);

    await transaction.workflowDefinitionTransition.deleteMany({
      where: { sourceStep: { workflowDefinitionId: workflow.id } },
    });
    await transaction.workflowDefinitionStep.updateMany({
      where: { workflowDefinitionId: workflow.id },
      data: { order: { increment: 1_000 } },
    });
    await transaction.workflowRunStep.deleteMany({
      where: {
        workflowRunId: workflow.id,
        id: { notIn: workflow.steps.map((step) => step.id) },
      },
    });
    for (const step of workflow.steps) {
      const definitionStep = {
        name: step.name,
        order: step.order,
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
        assigneeType: step.assignee.type === "role" ? "ROLE" as const : "USER" as const,
        assigneeUserId: step.assignee.type === "user" ? step.assignee.userId : null,
        assigneeRole: step.assignee.type === "role" ? step.assignee.role.toUpperCase() as "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" : null,
        priority: "NORMAL" as const,
      };
      const updated = await transaction.workflowDefinitionStep.updateMany({
        where: { id: step.id, workflowDefinitionId: workflow.id },
        data: definitionStep,
      });
      if (updated.count === 0) {
        const collision = await transaction.workflowDefinitionStep.findUnique({
          where: { id: step.id },
          select: { id: true },
        });
        if (collision) throw new Error("Workflow step identifier already exists.");
        await transaction.workflowDefinitionStep.create({
          data: {
            id: step.id,
            workflowDefinitionId: workflow.id,
            createdAt: mapIsoDateToDate(workflow.createdAt),
            ...definitionStep,
          },
        });
      }
    }
    await transaction.workflowDefinitionStep.deleteMany({
      where: {
        workflowDefinitionId: workflow.id,
        id: { notIn: workflow.steps.map((step) => step.id) },
      },
    });
    await transaction.workflowDefinitionTransition.createMany({
      data: workflow.steps.flatMap((step) => step.transitions.map((transition) => ({
        id: transition.id,
        sourceStepId: step.id,
        targetStepId: transition.targetStepId,
        name: transition.name,
        description: transition.description,
        result: transition.result,
        endsWorkflow: transition.endsWorkflow,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      }))),
    });

    await transaction.workflowRunStep.updateMany({
      where: { workflowRunId: workflow.id },
      data: { order: { increment: 1_000 } },
    });
    for (const step of workflow.steps) {
      const runStep = {
        workflowDefinitionStepId: step.id,
        name: step.name,
        order: step.order,
        status: mapWorkflowStepStatusToPrisma(step.status),
        executionResult: mapJsonToPrismaInput(step.executionResult),
        startedAt: mapOptionalIsoDateToDate(step.startedAt),
        finishedAt: mapOptionalIsoDateToDate(step.finishedAt),
        errorMessage: step.errorMessage,
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
        assigneeType: step.assignee.type === "role" ? "ROLE" as const : "USER" as const,
        assigneeUserId: step.assignee.type === "user" ? step.assignee.userId : null,
        assigneeRole: step.assignee.type === "role" ? step.assignee.role.toUpperCase() as "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" : null,
        priority: "NORMAL" as const,
      };
      const updated = await transaction.workflowRunStep.updateMany({
        where: { id: step.id, workflowRunId: workflow.id },
        data: runStep,
      });
      if (updated.count === 0) {
        const collision = await transaction.workflowRunStep.findUnique({
          where: { id: step.id },
          select: { id: true },
        });
        if (collision) throw new Error("Workflow run step identifier already exists.");
        await transaction.workflowRunStep.create({
          data: {
            id: step.id,
            workflowRunId: workflow.id,
            createdAt: mapIsoDateToDate(workflow.createdAt),
            ...runStep,
          },
        });
      }
    }
    await transaction.workflowRunStep.deleteMany({
      where: {
        workflowRunId: workflow.id,
        id: { notIn: workflow.steps.map((step) => step.id) },
      },
    });
    await transaction.workflowRun.update({
      where: { id: workflow.id },
      data: { currentStepId: workflow.currentStepId },
    });
    await transaction.workflowExecutionEvent.createMany({
      data: workflow.executionHistory.map((event) => mapWorkflowExecutionEventToPrisma(workflow.id, event)),
      skipDuplicates: true,
    });
  }

  private inTransaction<T>(work: (transaction: PrismaTransaction) => Promise<T>) {
    if ("$transaction" in this.prisma) {
      return (this.prisma as PrismaClient).$transaction(work);
    }
    return work(this.prisma as PrismaTransaction);
  }
}

export function createPrismaWorkflowPersistenceRepository(organizationId: string, createdByUserId = organizationId) {
  return new PrismaWorkflowPersistenceRepository(organizationId, undefined, createdByUserId);
}
