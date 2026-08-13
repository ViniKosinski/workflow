// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowDefinitionDetailsScreen } from "@/modules/workflowDefinitions/presentation/components/WorkflowDefinitionDetailsScreen";
import { WorkflowDefinitionListScreen } from "@/modules/workflowDefinitions/presentation/components/WorkflowDefinitionListScreen";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const definition = {
  id: "definition",
  definitionKey: "definition",
  revisionNumber: 1,
  lockVersion: 1,
  name: "Aprovação",
  status: "published",
  steps: [{ id: "step", name: "Análise", order: 1, assignee: { type: "role", role: "owner" }, transitions: [{ id: "done", name: "Finalizar", result: "done", endsWorkflow: true }] }],
  createdByUserId: "user",
  createdAt: "2026-07-23T10:00:00.000Z",
  updatedAt: "2026-07-23T10:00:00.000Z",
  form: [],
};

describe("workflow definition components", () => {
  beforeEach(() => { vi.restoreAllMocks(); push.mockReset(); });

  it("cria um rascunho linear pela interface", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ definitions: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ definition }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ definitions: [definition] })));
    render(<WorkflowDefinitionListScreen />);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Aprovação" } });
    fireEvent.change(screen.getByLabelText("Etapas, separadas por vírgula"), { target: { value: "Análise, Finalização" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar rascunho" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const payload = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(payload.steps).toHaveLength(2);
    expect(payload.steps[0].transitions[0].targetStepId).toBe(payload.steps[1].id);
  });

  it("inicia execução de revisão publicada", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ definition })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ run: { id: "run-1" } }), { status: 201 }));
    render(<WorkflowDefinitionDetailsScreen id="definition" />);
    await screen.findByText("Aprovação");
    fireEvent.click(screen.getByRole("button", { name: "Iniciar execução" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/workflow-runs/run-1"));
  });

  it("edita e salva uma revisao em rascunho", async () => {
    const draft = { ...definition, status: "draft", name: "Aprovacao em revisao" };
    const updated = {
      ...draft,
      name: "Aprovacao atualizada",
      steps: [{ ...draft.steps[0], name: "Analise atualizada" }],
    };
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ definition: draft })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ definition: updated })));
    render(<WorkflowDefinitionDetailsScreen id="definition" />);
    fireEvent.change(await screen.findByLabelText("Nome da definição"), {
      target: { value: "Aprovacao atualizada" },
    });
    fireEvent.change(screen.getAllByLabelText("Nome").at(-1)!, {
      target: { value: "Analise atualizada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(await screen.findByText("Rascunho salvo.")).toBeTruthy();
    expect(fetchMock.mock.calls[1][1]?.method).toBe("PATCH");
    const payload = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(payload.name).toBe("Aprovacao atualizada");
    expect(payload.steps[0].name).toBe("Analise atualizada");
  });
});
