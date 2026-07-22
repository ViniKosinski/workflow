import type { OrganizationRole } from "@/modules/organizations/domain/membership";
import type { StepAssignee } from "@/modules/workflows/domain/workflowEngine";

export type TaskPriority = "normal";

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
  status: "pending" | "running";
}>;

export type TaskHistoryEntry = Readonly<{
  id: string;
  type: string;
  occurredAt: string;
  executorUserId?: string;
  executorName?: string;
  transition?: string;
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
