// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OperationalDashboard } from "@/modules/dashboard/presentation/components/OperationalDashboard";

describe("OperationalDashboard", () => {
  it("apresenta indicadores, workflows e tarefas antigas", () => {
    vi.setSystemTime(new Date("2026-08-15T12:00:00.000Z"));
    render(<OperationalDashboard data={{
      organizationId: "org 1",
      periodDays: 7,
      pendingTasks: 3,
      runningTasks: 2,
      activeRuns: 4,
      completedRuns: 8,
      startedRunsInPeriod: 5,
      completedRunsInPeriod: 3,
      averageCompletionHours: 36,
      averageStepHours: 6,
      dailyThroughput: [{ date: "2026-08-15", started: 2, completed: 1 }],
      tasksByStatus: [{ status: "pending", count: 3 }, { status: "running", count: 2 }, { status: "completed", count: 7 }],
      runsByWorkflow: [{ workflowDefinitionId: "definition", workflowName: "Compras", total: 12, active: 4, completed: 8 }],
      oldestTasks: [{ id: "task", name: "Aprovar compra", workflowName: "Compras", assigneeName: "Aprovador", status: "pending", updatedAt: "2026-08-13T12:00:00.000Z" }],
    }} />);
    expect(screen.getByText("Operação da organização")).toBeTruthy();
    expect(screen.getByText("Compras")).toBeTruthy();
    expect(screen.getByText("2 dias sem atualização")).toBeTruthy();
    expect(screen.getByText("1,5 dias")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Últimos 7 dias" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: /Aprovar compra/ }).getAttribute("href")).toBe("/tasks/organization/task?organizationId=org%201");
    vi.useRealTimers();
  });
});
