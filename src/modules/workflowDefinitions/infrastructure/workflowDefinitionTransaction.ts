import { Prisma, type PrismaClient } from "@prisma/client";
import { WorkflowDefinitionConcurrencyError } from "@/modules/workflowDefinitions/domain/workflowDefinitionRepository";

export async function lockWorkflowDefinition(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  definitionKey: string,
) {
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext(${`${organizationId}:${definitionKey}`}))
  `;
}

export async function serializableWorkflowDefinitionTransaction<T>(
  prisma: PrismaClient,
  work: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  try {
    return await prisma.$transaction(work, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new WorkflowDefinitionConcurrencyError();
    }
    throw error;
  }
}
