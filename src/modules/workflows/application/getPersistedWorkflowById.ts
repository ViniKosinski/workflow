import type { WorkflowApplicationDependencies } from "@/modules/workflows/application/workflowApplicationTypes";
import { WorkflowNotFoundError } from "@/modules/workflows/application/workflowUseCaseErrors";

export async function getPersistedWorkflowById(
  dependencies: WorkflowApplicationDependencies,
  workflowId: string,
) {
  const workflow = await dependencies.workflowRepository.findById(workflowId);

  if (!workflow) {
    throw new WorkflowNotFoundError(workflowId);
  }

  return workflow;
}
