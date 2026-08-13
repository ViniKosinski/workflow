// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowRunDynamicForm } from "@/modules/workflowDefinitions/presentation/components/WorkflowRunDynamicForm";
import { WorkflowDefinitionFormEditor } from "@/modules/workflowDefinitions/presentation/components/WorkflowDefinitionFormEditor";

describe("dynamic workflow form components", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());
  it("renderiza obrigatórios e selects e envia valores editados", async () => {
    const form = {
      workflowRunId: "run", version: 1, values: { priority: "normal" },
      fields: [
        { id: "name", key: "name", label: "Nome", type: "text", required: true, order: 1, options: [] },
        { id: "priority", key: "priority", label: "Prioridade", type: "select", required: false, order: 2, options: [
          { id: "normal", value: "normal", label: "Normal", order: 1 },
          { id: "high", value: "high", label: "Alta", order: 2 },
        ] },
      ],
    };
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ form })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ form: { ...form, version: 2, values: { name: "ACME", priority: "high" } } })));
    render(<WorkflowRunDynamicForm runId="run" />);
    const name = await screen.findByLabelText("Nome *");
    expect((name as HTMLInputElement).required).toBe(true);
    fireEvent.change(name, { target: { value: "ACME" } });
    fireEvent.change(screen.getByLabelText("Prioridade"), { target: { value: "high" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados" }));
    expect(await screen.findByText("Dados salvos.")).toBeTruthy();
    const payload = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(payload).toEqual({ version: 1, values: { name: "ACME", priority: "high" } });
  });

  it("adiciona, edita, remove e reordena campos no editor", async () => {
    const first = { id: "first", key: "first", label: "Primeiro", type: "text", required: false, order: 1, options: [] };
    const second = { id: "second", key: "second", label: "Segundo", type: "text", required: false, order: 2, options: [] };
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ fields: [first, second] }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ fields: [second, first] })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<WorkflowDefinitionFormEditor definitionId="definition" initialFields={[]} />);
    fireEvent.change(screen.getByLabelText("Chave"), { target: { value: "first" } });
    fireEvent.change(screen.getByLabelText("Rótulo"), { target: { value: "Primeiro" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar campo" }));
    await screen.findByText(/Primeiro/);
    fireEvent.click(screen.getAllByRole("button", { name: "↓" })[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getAllByRole("button", { name: "Remover" })[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it("edita um campo existente", async () => {
    const initial = { id: "field", key: "customer", label: "Cliente", type: "text" as const, required: false, order: 1, options: [] };
    const updated = { ...initial, label: "Cliente principal" };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ fields: [updated] })));
    render(<WorkflowDefinitionFormEditor definitionId="definition" initialFields={[initial]} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Rótulo"), { target: { value: "Cliente principal" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar campo" }));
    await screen.findByText(/Cliente principal/);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
  });
});
