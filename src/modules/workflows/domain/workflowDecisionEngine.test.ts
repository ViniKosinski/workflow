import { describe, expect, it } from "vitest";
import { WorkflowDecisionEngine, WorkflowDecisionError } from "@/modules/workflows/domain/workflowDecisionEngine";
import type { Workflow, WorkflowStep } from "@/modules/workflows/domain/workflowEngine";

const step = (id: string, transitions: WorkflowStep["transitions"]): WorkflowStep => ({ id, name: id, order: Number(id.slice(1)), status: "pending", assignee: { type: "user", userId: "u1" }, priority: "normal", transitions });
const workflow = (steps: WorkflowStep[]): Workflow => ({ id: "w1", version: 1, name: "Decision", status: "draft", steps, executionHistory: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });

describe("WorkflowDecisionEngine", () => {
  const decisions = new WorkflowDecisionEngine();
  it("resolve o resultado escolhido", () => {
    const selected = decisions.resolve(step("s1", [
      { id: "t1", name: "Sim", result: "yes", targetStepId: "s2", endsWorkflow: false },
      { id: "t2", name: "Não", result: "no", endsWorkflow: true },
    ]), "no");
    expect(selected.endsWorkflow).toBe(true);
  });
  it("rejeita resultado inexistente", () => expect(() => decisions.resolve(step("s1", [{ id: "t1", name: "Sim", result: "yes", endsWorkflow: true }]), "no")).toThrow(WorkflowDecisionError));
  it("rejeita resultado duplicado", () => expect(() => decisions.validate(workflow([step("s1", [{ id: "t1", name: "A", result: "same", endsWorkflow: true }, { id: "t2", name: "B", result: "same", endsWorkflow: true }])]))).toThrow(/únicos/));
  it("rejeita destino inexistente", () => expect(() => decisions.validate(workflow([step("s1", [{ id: "t1", name: "A", result: "a", targetStepId: "missing", endsWorkflow: false }])]))).toThrow(/destino/));
  it("rejeita loop imediato", () => expect(() => decisions.validate(workflow([step("s1", [{ id: "t1", name: "A", result: "a", targetStepId: "s1", endsWorkflow: false }])]))).toThrow(/Loop/));
  it("rejeita etapa inalcançável", () => expect(() => decisions.validate(workflow([step("s1", [{ id: "t1", name: "Fim", result: "end", endsWorkflow: true }]), step("s2", [{ id: "t2", name: "Fim", result: "end", endsWorkflow: true }])]))).toThrow(/inicial/));
  it("aceita ramificação com continuação e encerramento", () => {
    const value = workflow([
      step("s1", [{ id: "t1", name: "Continuar", result: "continue", targetStepId: "s2", endsWorkflow: false }, { id: "t2", name: "Encerrar", result: "end", endsWorkflow: true }]),
      step("s2", [{ id: "t3", name: "Finalizar", result: "done", endsWorkflow: true }]),
    ]);
    expect(decisions.validate(value).id).toBe("s1");
  });
});
