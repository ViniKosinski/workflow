import type { WorkflowApplicationDependencies } from "@/modules/workflows/application/workflowApplicationTypes";
import type { ListWorkflowsParams } from "@/modules/workflows/domain/workflowPersistenceRepository";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";

export async function listPersistedWorkflows(
  dependencies: WorkflowApplicationDependencies,
  params?: ListWorkflowsParams,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowRead);
  return dependencies.workflowRepository.list(params);
}
