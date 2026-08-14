import type { TaskApplicationDependencies } from "@/modules/tasks/application/taskApplicationTypes";
import type { TaskListQuery } from "@/modules/tasks/domain/task";

export function listMyTasks(dependencies: TaskApplicationDependencies, userId: string, query: TaskListQuery) {
  return dependencies.tasks.listMine(userId, query);
}
