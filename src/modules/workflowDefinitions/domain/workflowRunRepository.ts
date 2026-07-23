import type { WorkflowDefinition } from "@/modules/workflowDefinitions/domain/workflowDefinition";
import type { Workflow } from "@/modules/workflows/domain/workflowEngine";

export type WorkflowRunRepository = Readonly<{
  create: (definition: WorkflowDefinition, run: Workflow, startedByUserId: string) => Promise<Workflow>;
  findById: (runId: string) => Promise<Workflow | null>;
  list: (input?: Readonly<{ definitionId?: string; limit?: number; offset?: number }>) => Promise<ReadonlyArray<Workflow>>;
}>;
