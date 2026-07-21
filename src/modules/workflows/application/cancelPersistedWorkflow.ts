import type {
  CancelWorkflowUseCaseInput,
  WorkflowApplicationDependencies,
} from "@/modules/workflows/application/workflowApplicationTypes";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import {
  WorkflowBusinessError,
  WorkflowValidationError,
} from "@/modules/workflows/application/workflowUseCaseErrors";

export async function cancelPersistedWorkflow(
  dependencies: WorkflowApplicationDependencies,
  input: CancelWorkflowUseCaseInput,
) {
  if (!input.reason.trim()) {
    throw new WorkflowValidationError("O motivo do cancelamento é obrigatório.");
  }

  const workflow = await getPersistedWorkflowById(
    dependencies,
    input.workflowId,
  );
  const result = dependencies.workflowEngine.cancelWorkflow({
    workflow,
    reason: input.reason.trim(),
  });

  if (!result.success) {
    throw new WorkflowBusinessError(result.error.message);
  }

  return dependencies.workflowRepository.update(result.data);
}
