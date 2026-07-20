import { mockWorkflowRepository } from "@/modules/workflows/infrastructure/mockWorkflowRepository";

export function getWorkflowSummaries() {
  return mockWorkflowRepository.listSummaries();
}
