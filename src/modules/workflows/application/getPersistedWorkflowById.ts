import type { WorkflowApplicationDependencies } from "@/modules/workflows/application/workflowApplicationTypes";
import { WorkflowNotFoundError } from "@/modules/workflows/application/workflowUseCaseErrors";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";

export async function getPersistedWorkflowById(
  dependencies: WorkflowApplicationDependencies,
  workflowId: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowRead);
  const workflow = await dependencies.workflowRepository.findById(workflowId);

  if (!workflow) {
    throw new WorkflowNotFoundError(workflowId);
  }

  return workflow;
}
