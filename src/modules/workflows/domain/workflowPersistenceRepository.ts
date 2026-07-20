import type {
  Workflow,
  WorkflowId,
  WorkflowStatus,
} from "@/modules/workflows/domain/workflowEngine";

export type ListWorkflowsParams = Readonly<{
  status?: WorkflowStatus;
  limit?: number;
  offset?: number;
}>;

export type WorkflowPersistenceRepository = Readonly<{
  save: (workflow: Workflow) => Promise<Workflow>;
  findById: (workflowId: WorkflowId) => Promise<Workflow | null>;
  list: (params?: ListWorkflowsParams) => Promise<ReadonlyArray<Workflow>>;
  update: (workflow: Workflow) => Promise<Workflow>;
  exists: (workflowId: WorkflowId) => Promise<boolean>;
}>;
