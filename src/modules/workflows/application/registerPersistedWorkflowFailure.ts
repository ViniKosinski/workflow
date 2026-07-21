import type {
  RegisterWorkflowFailureUseCaseInput,
  WorkflowApplicationDependencies,
} from "@/modules/workflows/application/workflowApplicationTypes";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import {
  WorkflowBusinessError,
  WorkflowValidationError,
} from "@/modules/workflows/application/workflowUseCaseErrors";

export async function registerPersistedWorkflowFailure(
  dependencies: WorkflowApplicationDependencies,
  input: RegisterWorkflowFailureUseCaseInput,
) {
  if (!input.failure.reason.trim()) {
    throw new WorkflowValidationError("O motivo da falha é obrigatório.");
  }

  const workflow = await getPersistedWorkflowById(
    dependencies,
    input.workflowId,
  );
  const result = dependencies.workflowEngine.registerFailure({
    workflow,
    stepId: input.stepId,
    failure: {
      ...input.failure,
      reason: input.failure.reason.trim(),
    },
  });

  if (!result.success) {
    throw new WorkflowBusinessError(result.error.message);
  }

  return dependencies.workflowRepository.update(result.data);
}
