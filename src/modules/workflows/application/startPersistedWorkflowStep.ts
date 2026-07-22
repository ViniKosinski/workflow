import type {
  WorkflowApplicationDependencies,
  WorkflowStepActionInput,
} from "@/modules/workflows/application/workflowApplicationTypes";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import { WorkflowBusinessError } from "@/modules/workflows/application/workflowUseCaseErrors";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";

export async function startPersistedWorkflowStep(
  dependencies: WorkflowApplicationDependencies,
  input: WorkflowStepActionInput,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowExecutionManage);
  const workflow = await getPersistedWorkflowById(
    dependencies,
    input.workflowId,
  );
  const result = dependencies.workflowEngine.startStep({
    workflow,
    stepId: input.stepId,
  });

  if (!result.success) {
    throw new WorkflowBusinessError(result.error.message);
  }

  return dependencies.workflowRepository.update(result.data);
}
