import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  WorkflowDefinition,
  WorkflowDefinitionStatus,
  WorkflowDefinitionStep,
} from "@/modules/workflowDefinitions/domain/workflowDefinition";
import {
  WorkflowDefinitionConcurrencyError,
  type WorkflowDefinitionRepository,
} from "@/modules/workflowDefinitions/domain/workflowDefinitionRepository";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";
import {
  lockWorkflowDefinition,
  serializableWorkflowDefinitionTransaction,
} from "@/modules/workflowDefinitions/infrastructure/workflowDefinitionTransaction";
import type { WorkflowFormValue } from "@/modules/workflowDefinitions/domain/workflowForm";

const include = {
  steps: { include: { outgoingTransitions: { orderBy: { createdAt: "asc" as const } } }, orderBy: { order: "asc" as const } },
  formFields: { include: { options: { orderBy: { order: "asc" as const } } }, orderBy: { order: "asc" as const } },
} satisfies Prisma.WorkflowDefinitionInclude;

type DefinitionRecord = Prisma.WorkflowDefinitionGetPayload<{ include: typeof include }>;
type Db = PrismaClient | Prisma.TransactionClient;

const statusToPrisma = (status: WorkflowDefinitionStatus) => status.toUpperCase() as "DRAFT" | "PUBLISHED" | "ARCHIVED";
const statusToDomain = (status: "DRAFT" | "PUBLISHED" | "ARCHIVED") => status.toLowerCase() as WorkflowDefinitionStatus;

function mapStep(record: DefinitionRecord["steps"][number]): WorkflowDefinitionStep {
  return {
    id: record.id,
    name: record.name,
    order: record.order,
    assignee: record.assigneeType === "USER"
      ? { type: "user", userId: record.assigneeUserId ?? "" }
      : { type: "role", role: record.assigneeRole!.toLowerCase() as "owner" | "admin" | "editor" | "viewer" },
    transitions: record.outgoingTransitions.map((transition) => ({
      id: transition.id,
      name: transition.name,
      description: transition.description ?? undefined,
      result: transition.result,
      targetStepId: transition.targetStepId ?? undefined,
      endsWorkflow: transition.endsWorkflow,
    })),
  };
}

function mapDefinition(record: DefinitionRecord): WorkflowDefinition {
  return {
    id: record.id,
    definitionKey: record.definitionKey,
    revisionNumber: record.revisionNumber,
    lockVersion: record.version,
    name: record.name,
    status: statusToDomain(record.status),
    steps: record.steps.map(mapStep),
    form: record.formFields.map((field) => ({
      id: field.id,
      key: field.key,
      label: field.label,
      description: field.description ?? undefined,
      type: field.type.toLowerCase() as WorkflowDefinition["form"][number]["type"],
      required: field.required,
      order: field.order,
      defaultValue: field.defaultValue === null ? undefined : field.defaultValue as WorkflowFormValue,
      options: field.options.map((option) => ({ id: option.id, value: option.value, label: option.label, order: option.order })),
    })),
    createdByUserId: record.createdByUserId,
    publishedByUserId: record.publishedByUserId ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    publishedAt: record.publishedAt?.toISOString(),
    archivedAt: record.archivedAt?.toISOString(),
  };
}

export class PrismaWorkflowDefinitionRepository implements WorkflowDefinitionRepository {
  constructor(
    private readonly organizationId: string,
    private readonly prisma: Db = prismaClient,
  ) {}

  async create(definition: WorkflowDefinition) {
    try {
      await this.transaction(async (transaction) => {
        await transaction.workflowDefinition.create({
        data: {
          id: definition.id,
          organizationId: this.organizationId,
          createdByUserId: definition.createdByUserId,
          definitionKey: definition.definitionKey,
          revisionNumber: definition.revisionNumber,
          version: definition.lockVersion,
          status: statusToPrisma(definition.status),
          name: definition.name,
          createdAt: new Date(definition.createdAt),
          updatedAt: new Date(definition.updatedAt),
        },
        });
      await this.replaceSteps(transaction, definition);
      await this.replaceForm(transaction, definition);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new WorkflowDefinitionConcurrencyError();
      }
      throw error;
    }
    return (await this.findById(definition.id))!;
  }

  async update(definition: WorkflowDefinition) {
    await this.transaction(async (transaction) => {
      const updated = await transaction.workflowDefinition.updateMany({
        where: { id: definition.id, organizationId: this.organizationId, version: definition.lockVersion },
        data: {
          name: definition.name,
          status: statusToPrisma(definition.status),
          publishedAt: definition.publishedAt ? new Date(definition.publishedAt) : null,
          publishedByUserId: definition.publishedByUserId ?? null,
          archivedAt: definition.archivedAt ? new Date(definition.archivedAt) : null,
          updatedAt: new Date(definition.updatedAt),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new WorkflowDefinitionConcurrencyError();
      if (definition.status === "draft") {
        await this.replaceSteps(transaction, definition);
        await this.replaceForm(transaction, definition);
      }
    });
    return (await this.findById(definition.id))!;
  }

  async publish(definition: WorkflowDefinition) {
    await this.definitionTransaction(definition.definitionKey, async (transaction) => {
      const current = await transaction.workflowDefinition.findFirst({
        where: {
          id: definition.id,
          organizationId: this.organizationId,
          version: definition.lockVersion,
          status: "DRAFT",
        },
        select: { id: true },
      });
      if (!current) throw new WorkflowDefinitionConcurrencyError();

      await transaction.workflowDefinition.updateMany({
        where: {
          organizationId: this.organizationId,
          definitionKey: definition.definitionKey,
          status: "PUBLISHED",
          id: { not: definition.id },
        },
        data: {
          status: "ARCHIVED",
          archivedAt: definition.publishedAt ? new Date(definition.publishedAt) : new Date(definition.updatedAt),
          updatedAt: new Date(definition.updatedAt),
          version: { increment: 1 },
        },
      });

      const updated = await transaction.workflowDefinition.updateMany({
        where: {
          id: definition.id,
          organizationId: this.organizationId,
          version: definition.lockVersion,
          status: "DRAFT",
        },
        data: {
          status: "PUBLISHED",
          publishedAt: definition.publishedAt ? new Date(definition.publishedAt) : null,
          publishedByUserId: definition.publishedByUserId ?? null,
          archivedAt: null,
          updatedAt: new Date(definition.updatedAt),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new WorkflowDefinitionConcurrencyError();
    });
    return (await this.findById(definition.id))!;
  }

  async archive(definition: WorkflowDefinition) {
    await this.definitionTransaction(definition.definitionKey, async (transaction) => {
      const updated = await transaction.workflowDefinition.updateMany({
        where: {
          id: definition.id,
          organizationId: this.organizationId,
          version: definition.lockVersion,
          status: { not: "ARCHIVED" },
        },
        data: {
          status: "ARCHIVED",
          archivedAt: definition.archivedAt ? new Date(definition.archivedAt) : new Date(definition.updatedAt),
          updatedAt: new Date(definition.updatedAt),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new WorkflowDefinitionConcurrencyError();
    });
    return (await this.findById(definition.id))!;
  }

  async createRevision(source: WorkflowDefinition, revision: WorkflowDefinition) {
    await this.definitionTransaction(source.definitionKey, async (transaction) => {
      const current = await transaction.workflowDefinition.findFirst({
        where: {
          id: source.id,
          organizationId: this.organizationId,
          definitionKey: source.definitionKey,
          version: source.lockVersion,
          status: "PUBLISHED",
        },
        select: { id: true },
      });
      if (!current) throw new WorkflowDefinitionConcurrencyError();

      const existingDraft = await transaction.workflowDefinition.findFirst({
        where: {
          organizationId: this.organizationId,
          definitionKey: source.definitionKey,
          status: "DRAFT",
        },
        select: { id: true },
      });
      if (existingDraft) throw new WorkflowDefinitionConcurrencyError();

      const latest = await transaction.workflowDefinition.aggregate({
        where: { organizationId: this.organizationId, definitionKey: source.definitionKey },
        _max: { revisionNumber: true },
      });
      const persisted = {
        ...revision,
        revisionNumber: (latest._max.revisionNumber ?? 0) + 1,
      };
      await transaction.workflowDefinition.create({
        data: {
          id: persisted.id,
          organizationId: this.organizationId,
          createdByUserId: persisted.createdByUserId,
          definitionKey: persisted.definitionKey,
          revisionNumber: persisted.revisionNumber,
          version: persisted.lockVersion,
          status: "DRAFT",
          name: persisted.name,
          createdAt: new Date(persisted.createdAt),
          updatedAt: new Date(persisted.updatedAt),
        },
      });
      await this.replaceSteps(transaction, persisted);
      await this.replaceForm(transaction, persisted);
    });
    return (await this.findById(revision.id))!;
  }

  async findById(id: string) {
    const record = await this.prisma.workflowDefinition.findFirst({
      where: { id, organizationId: this.organizationId },
      include,
    });
    return record ? mapDefinition(record) : null;
  }

  async list(input: Readonly<{ status?: WorkflowDefinitionStatus; limit?: number; offset?: number }> = {}) {
    const records = await this.prisma.workflowDefinition.findMany({
      where: { organizationId: this.organizationId, status: input.status ? statusToPrisma(input.status) : undefined },
      include,
      orderBy: [{ definitionKey: "asc" }, { revisionNumber: "desc" }],
      take: Math.min(Math.max(input.limit ?? 50, 1), 100),
      skip: Math.max(input.offset ?? 0, 0),
    });
    return records.map(mapDefinition);
  }

  async listRevisions(definitionKey: string) {
    const records = await this.prisma.workflowDefinition.findMany({
      where: { organizationId: this.organizationId, definitionKey },
      include,
      orderBy: { revisionNumber: "desc" },
    });
    return records.map(mapDefinition);
  }

  private async replaceSteps(transaction: Prisma.TransactionClient, definition: WorkflowDefinition) {
    await transaction.workflowDefinitionTransition.deleteMany({
      where: { sourceStep: { workflowDefinitionId: definition.id } },
    });
    await transaction.workflowDefinitionStep.deleteMany({ where: { workflowDefinitionId: definition.id } });
    await transaction.workflowDefinitionStep.createMany({
      data: definition.steps.map((step) => ({
        id: step.id,
        workflowDefinitionId: definition.id,
        name: step.name,
        order: step.order,
        assigneeType: step.assignee.type === "user" ? "USER" : "ROLE",
        assigneeUserId: step.assignee.type === "user" ? step.assignee.userId : null,
        assigneeRole: step.assignee.type === "role" ? step.assignee.role.toUpperCase() as "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" : null,
        priority: "NORMAL",
      })),
    });
    await transaction.workflowDefinitionTransition.createMany({
      data: definition.steps.flatMap((step) => step.transitions.map((transition) => ({
        id: transition.id,
        sourceStepId: step.id,
        targetStepId: transition.targetStepId,
        name: transition.name,
        description: transition.description,
        result: transition.result,
        endsWorkflow: transition.endsWorkflow,
      }))),
    });
  }

  private async replaceForm(transaction: Prisma.TransactionClient, definition: WorkflowDefinition) {
    await transaction.workflowDefinitionFormField.deleteMany({ where: { workflowDefinitionId: definition.id } });
    for (const field of definition.form) {
      await transaction.workflowDefinitionFormField.create({
        data: {
          id: field.id,
          workflowDefinitionId: definition.id,
          key: field.key,
          label: field.label,
          description: field.description,
          type: field.type.toUpperCase() as "TEXT" | "TEXTAREA" | "NUMBER" | "CURRENCY" | "BOOLEAN" | "DATE" | "DATETIME" | "SELECT" | "MULTISELECT",
          required: field.required,
          order: field.order,
          defaultValue: field.defaultValue === undefined ? undefined : field.defaultValue === null ? Prisma.JsonNull : field.defaultValue,
          options: {
            createMany: {
              data: field.options.map((option) => ({
                id: option.id,
                value: option.value,
                label: option.label,
                order: option.order,
              })),
            },
          },
        },
      });
    }
  }

  private transaction<T>(work: (transaction: Prisma.TransactionClient) => Promise<T>) {
    if ("$transaction" in this.prisma) return (this.prisma as PrismaClient).$transaction(work);
    return work(this.prisma as Prisma.TransactionClient);
  }

  private definitionTransaction<T>(
    definitionKey: string,
    work: (transaction: Prisma.TransactionClient) => Promise<T>,
  ) {
    if (!("$transaction" in this.prisma)) {
      return work(this.prisma as Prisma.TransactionClient);
    }
    return serializableWorkflowDefinitionTransaction(this.prisma as PrismaClient, async (transaction) => {
      await lockWorkflowDefinition(transaction, this.organizationId, definitionKey);
      return work(transaction);
    });
  }
}
