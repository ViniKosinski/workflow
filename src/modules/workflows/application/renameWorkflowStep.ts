import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import type {
  RenameWorkflowStepUseCaseInput,
  WorkflowApplicationDependencies,
} from "@/modules/workflows/application/workflowApplicationTypes";
import {
  WorkflowBusinessError,
  WorkflowValidationError,
} from "@/modules/workflows/application/workflowUseCaseErrors";

export async function renameWorkflowStep(
  dependencies: WorkflowApplicationDependencies,
  input: RenameWorkflowStepUseCaseInput,
) {
  if (!input.name.trim()) {
    throw new WorkflowValidationError("O nome da etapa é obrigatório.");
  }

  const workflow = await getPersistedWorkflowById(
    dependencies,
    input.workflowId,
  );
  const result = dependencies.workflowEngine.renameStep({
    workflow,
    stepId: input.stepId,
    name: input.name,
  });

  if (!result.success) {
    throw new WorkflowBusinessError(result.error.message);
  }

  return dependencies.workflowRepository.update(result.data);
}
