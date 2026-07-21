import type {
  WorkflowEngineService,
  WorkflowStepCompletionResult,
  WorkflowStepFailureResult,
} from "@/modules/workflows/domain/workflowEngine";
import type { WorkflowPersistenceRepository } from "@/modules/workflows/domain/workflowPersistenceRepository";

export type WorkflowApplicationDependencies = Readonly<{
  workflowEngine: WorkflowEngineService;
  workflowRepository: WorkflowPersistenceRepository;
}>;

export type CreateWorkflowUseCaseInput = Readonly<{
  name: string;
  steps: ReadonlyArray<
    Readonly<{
      name: string;
      order: number;
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

export type CompleteWorkflowStepUseCaseInput = WorkflowStepActionInput &
  Readonly<{
    result: WorkflowStepCompletionResult;
  }>;

export type RegisterWorkflowFailureUseCaseInput = Readonly<{
  workflowId: string;
  stepId?: string;
  failure: WorkflowStepFailureResult;
}>;
