import { Prisma, type PrismaClient } from "@prisma/client";
import type { WorkflowRunFormRepository } from "@/modules/workflowDefinitions/domain/workflowRunFormRepository";
import type { WorkflowFormField, WorkflowFormValue } from "@/modules/workflowDefinitions/domain/workflowForm";
import { WorkflowConcurrencyError } from "@/modules/workflows/domain/workflowPersistenceRepository";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

const include = {
  formFields: {
    include: { options: { orderBy: { order: "asc" as const } }, value: true },
    orderBy: { order: "asc" as const },
  },
} satisfies Prisma.WorkflowRunInclude;

type Db = PrismaClient | Prisma.TransactionClient;

export class PrismaWorkflowRunFormRepository implements WorkflowRunFormRepository {
  constructor(private readonly organizationId: string, private readonly prisma: Db = prismaClient) {}

  async find(runId: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, workflowDefinition: { organizationId: this.organizationId } },
      include,
    });
    if (!run) return null;
    const fields: WorkflowFormField[] = run.formFields.map((field) => ({
      id: field.id,
      key: field.key,
      label: field.label,
      description: field.description ?? undefined,
      type: field.type.toLowerCase() as WorkflowFormField["type"],
      required: field.required,
      order: field.order,
      defaultValue: field.defaultValue === null ? undefined : field.defaultValue as WorkflowFormValue,
      options: field.options.map((option) => ({ id: option.id, value: option.value, label: option.label, order: option.order })),
    }));
    return {
      workflowRunId: run.id,
      version: run.version,
      fields,
      values: Object.fromEntries(run.formFields.map((field) => [
        field.key,
        field.value ? field.value.value as WorkflowFormValue : field.defaultValue as WorkflowFormValue,
      ])),
    };
  }

  async updateValues(runId: string, expectedVersion: number, values: Readonly<Record<string, WorkflowFormValue>>, actorUserId: string) {
    try {
      await this.transaction(async (transaction) => {
      const updated = await transaction.workflowRun.updateMany({
        where: { id: runId, version: expectedVersion, workflowDefinition: { organizationId: this.organizationId } },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new WorkflowConcurrencyError(runId);
      const fields = await transaction.workflowRunFormField.findMany({
        where: { workflowRunId: runId, key: { in: Object.keys(values) } },
        select: { id: true, key: true },
      });
      if (fields.length !== Object.keys(values).length) throw new Error("Workflow run form field was not found.");
      for (const field of fields) {
        const value = values[field.key];
        await transaction.workflowRunFormValue.upsert({
          where: { fieldId: field.id },
          create: {
            workflowRunId: runId,
            fieldId: field.id,
            value: value === null ? Prisma.JsonNull : value,
            updatedByUserId: actorUserId,
          },
          update: {
            value: value === null ? Prisma.JsonNull : value,
            updatedByUserId: actorUserId,
          },
        });
      }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new WorkflowConcurrencyError(runId);
      }
      throw error;
    }
    return (await this.find(runId))!;
  }

  private transaction<T>(work: (transaction: Prisma.TransactionClient) => Promise<T>) {
    if ("$transaction" in this.prisma) {
      return (this.prisma as PrismaClient).$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
    return work(this.prisma as Prisma.TransactionClient);
  }
}
