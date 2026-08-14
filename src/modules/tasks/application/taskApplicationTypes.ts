import type { TaskAuthorizationService } from "@/modules/tasks/domain/task";
import type { TaskRepository } from "@/modules/tasks/domain/taskRepository";
import type { WorkflowEngineService, WorkflowExecutionMetadata } from "@/modules/workflows/domain/workflowEngine";
import type { WorkflowPersistenceRepository } from "@/modules/workflows/domain/workflowPersistenceRepository";
import type { TaskTransactionManager } from "@/modules/tasks/domain/taskTransaction";
import type { WorkflowFormService } from "@/modules/workflowDefinitions/domain/workflowForm";

export type TaskApplicationDependencies = Readonly<{
  tasks: TaskRepository;
  authorization: TaskAuthorizationService;
  transactions: TaskTransactionManager;
  forms?: WorkflowFormService;
  workflowsFor: (organizationId: string) => Readonly<{
    engine: WorkflowEngineService;
    repository: WorkflowPersistenceRepository;
  }>;
}>;

export type CompleteTaskInput = Readonly<{
  taskId: string;
  expectedWorkflowId?: string;
  message?: string;
  selectedResult?: string;
  observation?: string;
  metadata?: WorkflowExecutionMetadata;
  formVersion?: number;
  formValues?: Readonly<Record<string, unknown>>;
}>;
