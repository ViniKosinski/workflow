import type { Workflow } from "@/modules/workflows/domain/workflowEngine";

export type WorkflowApiResponse = {
  workflow: Workflow;
};

export type WorkflowListApiResponse = {
  workflows: Workflow[];
};

export type WorkflowApiErrorResponse = {
  message?: string;
};

export type WorkflowFormStep = {
  id: string;
  name: string;
};
