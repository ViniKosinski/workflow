import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import type {
  AddWorkflowStepUseCaseInput,
  WorkflowApplicationDependencies,
} from "@/modules/workflows/application/workflowApplicationTypes";
import {
  WorkflowBusinessError,
  WorkflowValidationError,
} from "@/modules/workflows/application/workflowUseCaseErrors";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";

export async function addWorkflowStep(
  dependencies: WorkflowApplicationDependencies,
  input: AddWorkflowStepUseCaseInput,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  if (!input.name.trim()) {
    throw new WorkflowValidationError("O nome da etapa é obrigatório.");
  }

  const workflow = await getPersistedWorkflowById(
    dependencies,
    input.workflowId,
  );
  const result = dependencies.workflowEngine.addStep({
    workflow,
    name: input.name,
  });

  if (!result.success) {
    throw new WorkflowBusinessError(result.error.message);
  }

  return dependencies.workflowRepository.update(result.data);
}
