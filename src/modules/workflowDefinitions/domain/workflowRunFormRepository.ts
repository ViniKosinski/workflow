import type { WorkflowFormField, WorkflowFormValue } from "@/modules/workflowDefinitions/domain/workflowForm";

export type WorkflowRunForm = Readonly<{
  workflowRunId: string;
  version: number;
  fields: ReadonlyArray<WorkflowFormField>;
  values: Readonly<Record<string, WorkflowFormValue>>;
}>;

export type WorkflowRunFormRepository = Readonly<{
  find: (runId: string) => Promise<WorkflowRunForm | null>;
  updateValues: (
    runId: string,
    expectedVersion: number,
    values: Readonly<Record<string, WorkflowFormValue>>,
    actorUserId: string,
  ) => Promise<WorkflowRunForm>;
}>;
