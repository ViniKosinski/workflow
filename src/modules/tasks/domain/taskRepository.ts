import type { OrganizationRole } from "@/modules/organizations/domain/membership";
import type { TaskHistoryEntry, TaskListQuery, TaskPage, WorkTask } from "@/modules/tasks/domain/task";

export type TaskAccess = Readonly<{ task: WorkTask; actorRole: OrganizationRole }>;

export type TaskRepository = Readonly<{
  listMine: (userId: string, query: TaskListQuery) => Promise<TaskPage>;
  findMine: (taskId: string, userId: string) => Promise<TaskAccess | null>;
  findForHistory: (taskId: string, userId: string) => Promise<TaskAccess | null>;
  listHistory: (taskId: string) => Promise<ReadonlyArray<TaskHistoryEntry>>;
}>;
