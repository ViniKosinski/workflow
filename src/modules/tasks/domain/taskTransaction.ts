import type { TaskRepository } from "@/modules/tasks/domain/taskRepository";
import type { WorkflowEngineService } from "@/modules/workflows/domain/workflowEngine";
import type { WorkflowPersistenceRepository } from "@/modules/workflows/domain/workflowPersistenceRepository";
import type { WorkflowRunFormRepository } from "@/modules/workflowDefinitions/domain/workflowRunFormRepository";

export type TaskTransactionContext = Readonly<{
  tasks: TaskRepository;
  workflow: (organizationId: string) => Readonly<{
    engine: WorkflowEngineService;
    repository: WorkflowPersistenceRepository;
  }>;
  runForms?: (organizationId: string) => WorkflowRunFormRepository;
}>;

export type TaskTransactionManager = Readonly<{
  run: <T>(work: (context: TaskTransactionContext) => Promise<T>) => Promise<T>;
}>;
