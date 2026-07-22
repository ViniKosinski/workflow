import { describe, expect, it } from "vitest";
import { WorkflowConcurrencyError } from "@/modules/workflows/domain/workflowPersistenceRepository";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

describe("workflow API responses", () => {
  it("mapeia conflito otimista para HTTP 409", () => {
    expect(workflowErrorResponse(new WorkflowConcurrencyError("workflow-id")).status).toBe(409);
  });
});
