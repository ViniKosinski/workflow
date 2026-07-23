import type { WorkflowApplicationDependencies } from "@/modules/workflows/application/workflowApplicationTypes";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import { WorkflowBusinessError } from "@/modules/workflows/application/workflowUseCaseErrors";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";
import type { WorkflowStepTransition } from "@/modules/workflows/domain/workflowEngine";

type TransitionData = Omit<WorkflowStepTransition, "id">;
async function load(dependencies: WorkflowApplicationDependencies, workflowId: string) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  return getPersistedWorkflowById(dependencies, workflowId);
}
function persist(dependencies: WorkflowApplicationDependencies, result: ReturnType<WorkflowApplicationDependencies["workflowEngine"]["addTransition"]>) {
  if (!result.success) throw new WorkflowBusinessError(result.error.message);
  return dependencies.workflowRepository.update(result.data);
}
export async function addWorkflowTransition(dependencies: WorkflowApplicationDependencies, workflowId: string, stepId: string, transition: TransitionData) {
  return persist(dependencies, dependencies.workflowEngine.addTransition({ workflow: await load(dependencies, workflowId), stepId, transition }));
}
export async function updateWorkflowTransition(dependencies: WorkflowApplicationDependencies, workflowId: string, stepId: string, transitionId: string, transition: TransitionData) {
  return persist(dependencies, dependencies.workflowEngine.updateTransition({ workflow: await load(dependencies, workflowId), stepId, transitionId, transition }));
}
export async function removeWorkflowTransition(dependencies: WorkflowApplicationDependencies, workflowId: string, stepId: string, transitionId: string) {
  return persist(dependencies, dependencies.workflowEngine.removeTransition({ workflow: await load(dependencies, workflowId), stepId, transitionId }));
}
