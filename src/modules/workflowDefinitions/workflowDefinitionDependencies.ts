import { createOrganizationAuthorizationGuard } from "@/modules/authorization/application/organizationAuthorizationGuard";
import { OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { WorkflowDefinitionService } from "@/modules/workflowDefinitions/domain/workflowDefinition";
import { PrismaWorkflowDefinitionRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowDefinitionRepository";
import { PrismaWorkflowRunRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowRunRepository";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { WorkflowAssignmentService } from "@/modules/workflows/domain/workflowEngine";
import { WorkflowFormService } from "@/modules/workflowDefinitions/domain/workflowForm";
import { PrismaWorkflowRunFormRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowRunFormRepository";

export function createWorkflowDefinitionDependencies(actorUserId: string, organizationId: string) {
  const ids = { create: () => crypto.randomUUID() };
  const memberships = new PrismaMembershipRepository();
  return {
    definitions: new PrismaWorkflowDefinitionRepository(organizationId),
    runs: new PrismaWorkflowRunRepository(organizationId),
    service: new WorkflowDefinitionService(),
    workflowEngine: createWorkflowEngine({
      clock: { now: () => new Date().toISOString() },
      idGenerator: {
        createWorkflowId: ids.create,
        createStepId: ids.create,
        createEventId: ids.create,
        createTransitionId: ids.create,
      },
    }),
    authorization: createOrganizationAuthorizationGuard(
      memberships,
      new OrganizationAuthorizationService(),
      actorUserId,
      organizationId,
    ),
    memberships,
    assignments: new WorkflowAssignmentService(),
    organizationId,
    forms: new WorkflowFormService(),
    runForms: new PrismaWorkflowRunFormRepository(organizationId),
    clock: { now: () => new Date().toISOString() },
    ids,
  };
}
