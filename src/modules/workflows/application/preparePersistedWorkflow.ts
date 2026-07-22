import type { WorkflowApplicationDependencies } from "@/modules/workflows/application/workflowApplicationTypes";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import { WorkflowBusinessError } from "@/modules/workflows/application/workflowUseCaseErrors";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";

export async function preparePersistedWorkflow(
  dependencies: WorkflowApplicationDependencies,
  workflowId: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowExecutionManage);
  const workflow = await getPersistedWorkflowById(dependencies, workflowId);
  const result = dependencies.workflowEngine.prepareWorkflow({ workflow });

  if (!result.success) {
    throw new WorkflowBusinessError(result.error.message);
  }

  return dependencies.workflowRepository.update(result.data);
}
