import type {
  StepAssignee,
  WorkflowEngineService,
  WorkflowStepCompletionResult,
  WorkflowStepFailureResult,
} from "@/modules/workflows/domain/workflowEngine";
import type { WorkflowPersistenceRepository } from "@/modules/workflows/domain/workflowPersistenceRepository";
import type { OrganizationAuthorizationGuard } from "@/modules/authorization/application/organizationAuthorizationGuard";

export type WorkflowApplicationDependencies = Readonly<{
  workflowEngine: WorkflowEngineService;
  workflowRepository: WorkflowPersistenceRepository;
  authorization: OrganizationAuthorizationGuard;
}>;

export type CreateWorkflowUseCaseInput = Readonly<{
  name: string;
  steps: ReadonlyArray<
    Readonly<{
      name: string;
      order: number;
      transitions?: ReadonlyArray<Readonly<{
        name: string;
        result: string;
        targetStepOrder?: number;
        endsWorkflow: boolean;
      }>>;
    }>
  >;
}>;

export type CancelWorkflowUseCaseInput = Readonly<{
  workflowId: string;
  reason: string;
}>;

export type WorkflowStepActionInput = Readonly<{
  workflowId: string;
  stepId: string;
}>;

export type AssignWorkflowStepUseCaseInput = WorkflowStepActionInput & Readonly<{ assignee: StepAssignee }>;

export type AddWorkflowStepUseCaseInput = Readonly<{
  workflowId: string;
  name: string;
}>;

export type RenameWorkflowStepUseCaseInput = WorkflowStepActionInput &
  Readonly<{
    name: string;
  }>;

export type ReorderWorkflowStepsUseCaseInput = Readonly<{
  workflowId: string;
  orderedStepIds: ReadonlyArray<string>;
}>;

export type CompleteWorkflowStepUseCaseInput = WorkflowStepActionInput &
  Readonly<{
    result: WorkflowStepCompletionResult;
  }>;

export type RegisterWorkflowFailureUseCaseInput = Readonly<{
  workflowId: string;
  stepId?: string;
  failure: WorkflowStepFailureResult;
}>;
