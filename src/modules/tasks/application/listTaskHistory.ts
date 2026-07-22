import type { TaskApplicationDependencies } from "@/modules/tasks/application/taskApplicationTypes";
import { getMyTask } from "@/modules/tasks/application/getMyTask";
import { TaskNotFoundError } from "@/modules/tasks/domain/task";

export async function listTaskHistory(dependencies: TaskApplicationDependencies, taskId: string, userId: string) {
  await getMyTask(dependencies, taskId, userId);
  const history = await dependencies.tasks.listHistory(taskId, userId);
  if (!history) throw new TaskNotFoundError();
  return history;
}
