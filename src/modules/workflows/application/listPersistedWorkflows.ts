import type { WorkflowApplicationDependencies } from "@/modules/workflows/application/workflowApplicationTypes";
import type { ListWorkflowsParams } from "@/modules/workflows/domain/workflowPersistenceRepository";

export function listPersistedWorkflows(
  dependencies: WorkflowApplicationDependencies,
  params?: ListWorkflowsParams,
) {
  return dependencies.workflowRepository.list(params);
}
