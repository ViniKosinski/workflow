import type { WorkflowRepository } from "@/modules/workflows/domain/workflowRepository";

export function getWorkflowSummaries(repository: WorkflowRepository) {
  return repository.listSummaries();
}
