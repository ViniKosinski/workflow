import type { TaskApplicationDependencies } from "@/modules/tasks/application/taskApplicationTypes";
import { TaskNotFoundError } from "@/modules/tasks/domain/task";

export async function getMyTask(dependencies: TaskApplicationDependencies, taskId: string, userId: string) {
  const access = await dependencies.tasks.findMine(taskId, userId);
  if (!access) throw new TaskNotFoundError();
  dependencies.authorization.requireResponsible(userId, access.actorRole, access.task.assignee);
  return access.task;
}
