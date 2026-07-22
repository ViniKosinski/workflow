import { describe, expect, it } from "vitest";
import { TaskAuthorizationService, TaskNotFoundError } from "@/modules/tasks/domain/task";
import { WorkflowAssignmentError, WorkflowAssignmentService } from "@/modules/workflows/domain/workflowEngine";

describe("TaskAuthorizationService", () => {
  const service = new TaskAuthorizationService();
  it("permite o usuário diretamente responsável", () => expect(service.isResponsible("u1", "viewer", { type: "user", userId: "u1" })).toBe(true));
  it("rejeita outro usuário", () => expect(() => service.requireResponsible("u2", "owner", { type: "user", userId: "u1" })).toThrow(TaskNotFoundError));
  it("permite membro com o papel responsável", () => expect(service.isResponsible("u1", "editor", { type: "role", role: "editor" })).toBe(true));
  it("rejeita membro com papel diferente", () => expect(service.isResponsible("u1", "viewer", { type: "role", role: "editor" })).toBe(false));
});

describe("WorkflowAssignmentService", () => {
  it("aceita membro da organização", () => expect(() => new WorkflowAssignmentService().requireValid({ type: "user", userId: "u1" }, new Set(["u1"]))).not.toThrow());
  it("rejeita usuário externo", () => expect(() => new WorkflowAssignmentService().requireValid({ type: "user", userId: "u2" }, new Set(["u1"]))).toThrow(WorkflowAssignmentError));
});
