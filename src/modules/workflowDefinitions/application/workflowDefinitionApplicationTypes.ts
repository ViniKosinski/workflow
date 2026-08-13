import type { OrganizationAuthorizationGuard } from "@/modules/authorization/application/organizationAuthorizationGuard";
import type { WorkflowDefinitionService, WorkflowDefinitionStep } from "@/modules/workflowDefinitions/domain/workflowDefinition";
import type { WorkflowDefinitionRepository } from "@/modules/workflowDefinitions/domain/workflowDefinitionRepository";
import type { WorkflowRunRepository } from "@/modules/workflowDefinitions/domain/workflowRunRepository";
import type { WorkflowEngineService } from "@/modules/workflows/domain/workflowEngine";
import type { MembershipRepository } from "@/modules/organizations/domain/membershipRepository";
import type { WorkflowAssignmentService } from "@/modules/workflows/domain/workflowEngine";
import type { WorkflowFormService, WorkflowFormFieldType, WorkflowFormValue } from "@/modules/workflowDefinitions/domain/workflowForm";
import type { WorkflowRunFormRepository } from "@/modules/workflowDefinitions/domain/workflowRunFormRepository";

export type WorkflowDefinitionApplicationDependencies = Readonly<{
  definitions: WorkflowDefinitionRepository;
  runs: WorkflowRunRepository;
  service: WorkflowDefinitionService;
  workflowEngine: WorkflowEngineService;
  authorization: OrganizationAuthorizationGuard;
  memberships: MembershipRepository;
  assignments: WorkflowAssignmentService;
  organizationId: string;
  forms: WorkflowFormService;
  runForms: WorkflowRunFormRepository;
  clock: Readonly<{ now: () => string }>;
  ids: Readonly<{ create: () => string }>;
}>;

export type WorkflowFormFieldCommand = Readonly<{
  key: string;
  label: string;
  description?: string;
  type: WorkflowFormFieldType;
  required: boolean;
  order: number;
  defaultValue?: WorkflowFormValue;
  options: ReadonlyArray<Readonly<{ value: string; label: string; order: number }>>;
}>;

export type WorkflowDefinitionCommand = Readonly<{
  name: string;
  steps: ReadonlyArray<WorkflowDefinitionStep>;
}>;
