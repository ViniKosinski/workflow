import type {
  CreateWorkflowUseCaseInput,
  WorkflowApplicationDependencies,
} from "@/modules/workflows/application/workflowApplicationTypes";
import {
  WorkflowBusinessError,
  WorkflowValidationError,
} from "@/modules/workflows/application/workflowUseCaseErrors";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";

export async function createWorkflow(
  dependencies: WorkflowApplicationDependencies,
  input: CreateWorkflowUseCaseInput,
  actorUserId: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowCreate);
  if (!input.name.trim()) {
    throw new WorkflowValidationError("O nome do fluxo é obrigatório.");
  }

  if (input.steps.length === 0) {
    throw new WorkflowValidationError("O fluxo precisa ter pelo menos uma etapa.");
  }

  const hasInvalidStep = input.steps.some((step) => !step.name.trim());

  if (hasInvalidStep) {
    throw new WorkflowValidationError("Todas as etapas precisam ter nome.");
  }

  const orders = new Set(input.steps.map((step) => step.order));

  if (orders.size !== input.steps.length) {
    throw new WorkflowValidationError("As etapas não podem ter ordem duplicada.");
  }

  const result = dependencies.workflowEngine.createWorkflow({
    name: input.name.trim(),
    steps: input.steps.map((step) => ({
      name: step.name.trim(),
      order: step.order,
      assignee: { type: "user", userId: actorUserId },
    })),
  });

  if (!result.success) {
    throw new WorkflowBusinessError(result.error.message);
  }

  return dependencies.workflowRepository.save(result.data);
}
