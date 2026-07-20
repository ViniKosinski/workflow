import type { WorkflowSummary } from "@/modules/workflows/domain/workflow";

export type WorkflowRepository = {
  listSummaries: () => WorkflowSummary[];
};
