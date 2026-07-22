import type { OrganizationRole } from "@/modules/organizations/domain/membership";
import type { TaskHistoryEntry, WorkTask } from "@/modules/tasks/domain/task";

export type TaskAccess = Readonly<{ task: WorkTask; actorRole: OrganizationRole }>;

export type TaskRepository = Readonly<{
  listMine: (userId: string, order: "asc" | "desc") => Promise<ReadonlyArray<WorkTask>>;
  findMine: (taskId: string, userId: string) => Promise<TaskAccess | null>;
  listHistory: (taskId: string, userId: string) => Promise<ReadonlyArray<TaskHistoryEntry> | null>;
}>;
