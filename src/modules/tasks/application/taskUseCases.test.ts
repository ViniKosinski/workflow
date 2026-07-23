import { describe, expect, it, vi } from "vitest";
import { completeTask } from "@/modules/tasks/application/completeTask";
import { getMyTask } from "@/modules/tasks/application/getMyTask";
import { TaskAuthorizationService, TaskNotFoundError, type WorkTask } from "@/modules/tasks/domain/task";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";

const task: WorkTask = { id: "s1", workflowId: "w1", workflowName: "Fluxo", organizationId: "o1", organizationName: "Org", stepName: "Revisar", assignee: { type: "user", userId: "u1" }, assigneeName: "Ana", priority: "normal", createdAt: "2026-01-01T00:00:00.000Z", status: "pending", outcomes: [{ result: "completed", name: "Concluir" }] };
const engine = createWorkflowEngine({ clock: { now: () => "2026-01-02T00:00:00.000Z" }, idGenerator: { createWorkflowId: () => "w1", createStepId: () => "s1", createEventId: () => crypto.randomUUID() } });

describe("task use cases", () => {
  it("não revela tarefa fora da responsabilidade", async () => {
    const dependencies = { tasks: { listMine: vi.fn(), findMine: vi.fn().mockResolvedValue({ task, actorRole: "viewer" }), findForHistory: vi.fn(), listHistory: vi.fn() }, authorization: new TaskAuthorizationService(), workflowsFor: vi.fn(), transactions: { run: vi.fn() } };
    await expect(getMyTask(dependencies, "s1", "u2")).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("inicia e conclui a etapa em uma única persistência", async () => {
    const created = engine.createWorkflow({ id: "w1", name: "Fluxo", steps: [{ id: "s1", name: "Revisar", order: 1, assignee: { type: "user", userId: "u1" } }] });
    if (!created.success) throw new Error("fixture inválida");
    const prepared = engine.prepareWorkflow({ workflow: created.data });
    if (!prepared.success) throw new Error("fixture inválida");
    const running = engine.startExecution({ workflow: prepared.data });
    if (!running.success) throw new Error("fixture inválida");
    const update = vi.fn(async (workflow) => workflow);
    const dependencies = {
      tasks: { listMine: vi.fn(), findMine: vi.fn().mockResolvedValue({ task, actorRole: "viewer" }), findForHistory: vi.fn(), listHistory: vi.fn() },
      authorization: new TaskAuthorizationService(),
      workflowsFor: vi.fn(() => ({ engine, repository: { findById: vi.fn().mockResolvedValue(running.data), update, save: vi.fn(), list: vi.fn(), exists: vi.fn() } })),
      transactions: { run: vi.fn(async (work) => work({ tasks: { listMine: vi.fn(), findMine: vi.fn().mockResolvedValue({ task, actorRole: "viewer" }), findForHistory: vi.fn(), listHistory: vi.fn() }, workflow: () => ({ engine, repository: { findById: vi.fn().mockResolvedValue(running.data), update, save: vi.fn(), list: vi.fn(), exists: vi.fn() } }) })) },
    };
    const result = await completeTask(dependencies, { taskId: "s1", message: "Aprovado" }, "u1");
    expect(update).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("completed");
    expect(result.executionHistory.some((event) => event.metadata?.executorUserId === "u1")).toBe(true);
  });
});
