// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskList } from "@/modules/tasks/presentation/components/TaskList";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("TaskList", () => {
  it("mostra loading e renderiza a fila", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tasks: [{ id: "t1", workflowId: "w1", workflowName: "Fluxo", organizationId: "o1", organizationName: "Org", stepName: "Aprovar", assignee: { type: "user", userId: "u1" }, assigneeName: "Ana", priority: "normal", createdAt: "2026-01-01T00:00:00.000Z", status: "pending" }] }) }));
    render(<TaskList />);
    expect(screen.getByText("Carregando sua fila...")).toBeTruthy();
    expect(await screen.findByText("Aprovar")).toBeTruthy();
  });

  it("recarrega ao alterar a ordenação", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tasks: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskList />);
    await screen.findByText("Sua fila está vazia.");
    await userEvent.selectOptions(screen.getByLabelText(/Ordenar por data/), "asc");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/tasks?order=asc"));
  });
});
