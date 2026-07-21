import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import type {
  WorkflowApplicationDependencies,
  WorkflowStepActionInput,
} from "@/modules/workflows/application/workflowApplicationTypes";
import { WorkflowBusinessError } from "@/modules/workflows/application/workflowUseCaseErrors";

export async function removeWorkflowStep(
  dependencies: WorkflowApplicationDependencies,
  input: WorkflowStepActionInput,
) {
  const workflow = await getPersistedWorkflowById(
    dependencies,
    input.workflowId,
  );
  const result = dependencies.workflowEngine.removeStep({
    workflow,
    stepId: input.stepId,
  });

  if (!result.success) {
    throw new WorkflowBusinessError(result.error.message);
  }

  return dependencies.workflowRepository.update(result.data);
}
