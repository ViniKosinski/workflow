import type { TaskAuthorizationService } from "@/modules/tasks/domain/task";
import type { TaskRepository } from "@/modules/tasks/domain/taskRepository";
import type { WorkflowEngineService, WorkflowExecutionMetadata } from "@/modules/workflows/domain/workflowEngine";
import type { WorkflowPersistenceRepository } from "@/modules/workflows/domain/workflowPersistenceRepository";

export type TaskApplicationDependencies = Readonly<{
  tasks: TaskRepository;
  authorization: TaskAuthorizationService;
  workflowsFor: (organizationId: string) => Readonly<{
    engine: WorkflowEngineService;
    repository: WorkflowPersistenceRepository;
  }>;
}>;

export type CompleteTaskInput = Readonly<{
  taskId: string;
  message?: string;
  metadata?: WorkflowExecutionMetadata;
}>;
