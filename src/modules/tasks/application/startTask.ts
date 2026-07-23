import type { TaskApplicationDependencies } from "@/modules/tasks/application/taskApplicationTypes";
import { getMyTask } from "@/modules/tasks/application/getMyTask";
import { WorkflowBusinessError, WorkflowNotFoundError } from "@/modules/workflows/application/workflowUseCaseErrors";

export async function startTask(dependencies: TaskApplicationDependencies, taskId: string, userId: string, expectedWorkflowId?: string) {
  return dependencies.transactions.run(async (transaction) => {
    const task = await getMyTask({ ...dependencies, tasks: transaction.tasks }, taskId, userId);
    if (expectedWorkflowId && task.workflowId !== expectedWorkflowId) throw new WorkflowNotFoundError(expectedWorkflowId);
    const { engine, repository } = transaction.workflow(task.organizationId);
    const workflow = await repository.findById(task.workflowId);
    if (!workflow) throw new WorkflowNotFoundError(task.workflowId);
    const started = engine.startStep({ workflow, stepId: task.id });
    if (!started.success) throw new WorkflowBusinessError(started.error.message);
    return repository.update(started.data);
  });
}
