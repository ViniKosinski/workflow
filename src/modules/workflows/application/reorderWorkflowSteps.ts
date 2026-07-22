import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import type {
  ReorderWorkflowStepsUseCaseInput,
  WorkflowApplicationDependencies,
} from "@/modules/workflows/application/workflowApplicationTypes";
import {
  WorkflowBusinessError,
  WorkflowValidationError,
} from "@/modules/workflows/application/workflowUseCaseErrors";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";

export async function reorderWorkflowSteps(
  dependencies: WorkflowApplicationDependencies,
  input: ReorderWorkflowStepsUseCaseInput,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  if (input.orderedStepIds.length === 0) {
    throw new WorkflowValidationError("A nova ordem precisa informar etapas.");
  }

  const workflow = await getPersistedWorkflowById(
    dependencies,
    input.workflowId,
  );
  const result = dependencies.workflowEngine.reorderSteps({
    workflow,
    orderedStepIds: input.orderedStepIds,
  });

  if (!result.success) {
    throw new WorkflowBusinessError(result.error.message);
  }

  return dependencies.workflowRepository.update(result.data);
}
