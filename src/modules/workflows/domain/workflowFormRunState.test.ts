import { describe, expect, it } from "vitest";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { WORKFLOW_STATUSES, type Workflow } from "@/modules/workflows/domain/workflowEngine";

const engine = createWorkflowEngine({
  clock: { now: () => "2026-07-29T12:00:00.000Z" },
  idGenerator: { createWorkflowId: () => "workflow", createStepId: () => "step", createEventId: () => "event" },
});

const workflow = (status: Workflow["status"]) => ({
  id: "run", version: 1, name: "Run", status, steps: [], executionHistory: [],
  createdAt: "2026-07-29T10:00:00.000Z", updatedAt: "2026-07-29T10:00:00.000Z",
}) as Workflow;

describe("workflow run form state invariant", () => {
  it("aceita alteração apenas durante execução ativa", () => {
    expect(engine.validateFormValuesUpdate(workflow(WORKFLOW_STATUSES.running)).success).toBe(true);
  });

  it.each([
    WORKFLOW_STATUSES.completed,
    WORKFLOW_STATUSES.cancelled,
    WORKFLOW_STATUSES.failed,
  ])("rejeita alteração no estado terminal %s", (status) => {
    expect(engine.validateFormValuesUpdate(workflow(status))).toMatchObject({
      success: false,
      error: { code: "INVALID_OPERATION" },
    });
  });
});
