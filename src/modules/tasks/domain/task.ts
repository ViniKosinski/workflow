import type { OrganizationRole } from "@/modules/organizations/domain/membership";
import type { StepAssignee } from "@/modules/workflows/domain/workflowEngine";

export type TaskPriority = "normal";
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type TaskListQuery = Readonly<{
  order: "asc" | "desc";
  search?: string;
  status?: "pending" | "running";
  organizationId?: string;
  page: number;
  pageSize: number;
}>;

export type OrganizationTaskListQuery = Readonly<{
  order: "asc" | "desc";
  search?: string;
  status?: "pending" | "running" | "completed";
  assigneeUserId?: string;
  page: number;
  pageSize: number;
}>;

export type TaskPage = Readonly<{
  tasks: ReadonlyArray<WorkTask>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

export type WorkTask = Readonly<{
  id: string;
  workflowId: string;
  workflowName: string;
  organizationId: string;
  organizationName: string;
  stepName: string;
  assignee: StepAssignee;
  assigneeName: string;
  priority: TaskPriority;
  createdAt: string;
  status: TaskStatus;
  outcomes: ReadonlyArray<Readonly<{ result: string; name: string; description?: string }>>;
}>;

export type TaskHistoryEntry = Readonly<{
  id: string;
  type: string;
  occurredAt: string;
  executorUserId?: string;
  executorName?: string;
  transition?: string;
  selectedResult?: string;
  sourceStepId?: string;
  targetStepId?: string;
  observation?: string;
  workflowEnded?: boolean;
  message: string;
}>;

export class TaskNotFoundError extends Error {
  constructor() {
    super("Tarefa não encontrada.");
    this.name = "TaskNotFoundError";
  }
}

export class TaskAuthorizationService {
  isResponsible(userId: string, role: OrganizationRole, assignee: StepAssignee) {
    return assignee.type === "user"
      ? assignee.userId === userId
      : assignee.role === role;
  }

  requireResponsible(userId: string, role: OrganizationRole, assignee: StepAssignee) {
    if (!this.isResponsible(userId, role, assignee)) throw new TaskNotFoundError();
  }
}
