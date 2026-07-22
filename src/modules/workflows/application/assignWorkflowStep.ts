import type { AssignWorkflowStepUseCaseInput, WorkflowApplicationDependencies } from "@/modules/workflows/application/workflowApplicationTypes";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import { WorkflowBusinessError, WorkflowValidationError } from "@/modules/workflows/application/workflowUseCaseErrors";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";
import type { MembershipRepository } from "@/modules/organizations/domain/membershipRepository";
import { WorkflowAssignmentError, WorkflowAssignmentService } from "@/modules/workflows/domain/workflowEngine";

export async function assignWorkflowStep(
  dependencies: WorkflowApplicationDependencies,
  memberships: MembershipRepository,
  organizationId: string,
  input: AssignWorkflowStepUseCaseInput,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  try {
    const memberIds = new Set((await memberships.list(organizationId)).map((membership) => membership.userId));
    new WorkflowAssignmentService().requireValid(input.assignee, memberIds);
  } catch (error) {
    if (error instanceof WorkflowAssignmentError) throw new WorkflowValidationError(error.message);
    throw error;
  }
  const workflow = await getPersistedWorkflowById(dependencies, input.workflowId);
  const result = dependencies.workflowEngine.assignStep({ workflow, stepId: input.stepId, assignee: input.assignee });
  if (!result.success) throw new WorkflowBusinessError(result.error.message);
  return dependencies.workflowRepository.update(result.data);
}
