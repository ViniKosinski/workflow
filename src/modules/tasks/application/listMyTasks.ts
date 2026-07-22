import type { TaskApplicationDependencies } from "@/modules/tasks/application/taskApplicationTypes";

export function listMyTasks(dependencies: TaskApplicationDependencies, userId: string, order: "asc" | "desc" = "desc") {
  return dependencies.tasks.listMine(userId, order);
}
