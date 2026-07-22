import type {
  CompleteWorkflowStepUseCaseInput,
  WorkflowApplicationDependencies,
} from "@/modules/workflows/application/workflowApplicationTypes";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import { WorkflowBusinessError } from "@/modules/workflows/application/workflowUseCaseErrors";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";

export async function completePersistedWorkflowStep(
  dependencies: WorkflowApplicationDependencies,
  input: CompleteWorkflowStepUseCaseInput,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowExecutionManage);
  const workflow = await getPersistedWorkflowById(
    dependencies,
    input.workflowId,
  );
  const result = dependencies.workflowEngine.completeStep({
    workflow,
    stepId: input.stepId,
    result: input.result,
  });

  if (!result.success) {
    throw new WorkflowBusinessError(result.error.message);
  }

  return dependencies.workflowRepository.update(result.data);
}
