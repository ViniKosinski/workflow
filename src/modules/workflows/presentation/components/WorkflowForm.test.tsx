// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkflowForm } from "@/modules/workflows/presentation/components/WorkflowForm";

const push = vi.fn(); const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); push.mockReset(); refresh.mockReset(); });

describe("WorkflowForm visual", () => {
  it("permite desenhar, nomear e reorganizar atividades", async () => {
    render(<WorkflowForm />); const user = userEvent.setup();
    expect(screen.getByText("Fluxo iniciado")).toBeTruthy(); expect(screen.getAllByText("Fim").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "+ Nova atividade" }));
    expect(screen.getByRole("button", { name: /Configurar etapa 2/ })).toBeTruthy();
    const field = screen.getByLabelText("Nome da atividade"); await user.clear(field); await user.type(field, "Conferir pagamento");
    expect(screen.getByRole("button", { name: /Conferir pagamento/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "← Anterior" }));
    expect(screen.getByRole("button", { name: /Configurar etapa 1: Conferir pagamento/ })).toBeTruthy();
  });

  it("envia ao backend a ordem desenhada", async () => {
    const fetchMock = vi.fn().mockImplementation((_, options) => Promise.resolve(options?.method === "POST" ? new Response(JSON.stringify({ workflow: { id: "workflow-1" } }), { status: 201, headers: { "content-type": "application/json" } }) : new Response(JSON.stringify({ workflows: [] })))); vi.stubGlobal("fetch", fetchMock);
    render(<WorkflowForm />); const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nome do fluxo"), "Entrada de cliente");
    await user.click(screen.getByRole("button", { name: "Criar fluxo visual" }));
    await waitFor(() => expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(true));
    const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST")!;
    expect(JSON.parse(post[1].body)).toEqual({ name: "Entrada de cliente", steps: [{ name: "Primeira atividade", order: 1, transitions: [{ name: "Concluir", result: "concluir_1", endsWorkflow: true }] }] });
    expect(push).toHaveBeenCalledWith("/workflows/workflow-1");
  });

  it("permite criar múltiplos resultados com destinos diferentes", async () => {
    const fetchMock = vi.fn().mockImplementation((_, options) => Promise.resolve(options?.method === "POST" ? new Response(JSON.stringify({ workflow: { id: "workflow-2" } }), { status: 201 }) : new Response(JSON.stringify({ workflows: [] })))); vi.stubGlobal("fetch", fetchMock);
    render(<WorkflowForm />); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "+ Nova atividade" }));
    await user.click(screen.getByRole("button", { name: /Configurar etapa 1/ }));
    await user.clear(screen.getByLabelText("Nome do resultado 1")); await user.type(screen.getByLabelText("Nome do resultado 1"), "Pagamento confirmado");
    await user.selectOptions(screen.getByLabelText("Destino do resultado 1"), screen.getByRole("option", { name: "Ir para: Atividade 2" }));
    await user.click(screen.getByRole("button", { name: "+ Resultado" }));
    await user.clear(screen.getByLabelText("Nome do resultado 2")); await user.type(screen.getByLabelText("Nome do resultado 2"), "Não faturado");
    await user.type(screen.getByLabelText("Nome do fluxo"), "Novo cliente");
    await user.click(screen.getByRole("button", { name: "Criar fluxo visual" }));
    await waitFor(() => expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(true));
    const payload = JSON.parse(fetchMock.mock.calls.find((call) => call[1]?.method === "POST")![1].body);
    expect(payload.steps[0].transitions).toEqual([
      { name: "Pagamento confirmado", result: "pagamento_confirmado_1", endsWorkflow: false, targetStepOrder: 2 },
      { name: "Não faturado", result: "nao_faturado_2", endsWorkflow: true },
    ]);
  });

  it("monta o exemplo com ligação para uma etapa do fluxo de rescisão", async () => {
    const created: unknown[] = [];
    const fetchMock = vi.fn().mockImplementation((_, options) => {
      if (!options?.method) return Promise.resolve(new Response(JSON.stringify({ workflows: [] })));
      const body = JSON.parse(options.body); created.push(body);
      if (body.name === "Rescisão - Exemplo") return Promise.resolve(new Response(JSON.stringify({ workflow: { id: "cancellation", name: body.name, steps: body.steps.map((step: { name: string }, index: number) => ({ id: `cancel-${index + 1}`, name: step.name })) } }), { status: 201 }));
      return Promise.resolve(new Response(JSON.stringify({ workflow: { id: "onboarding" } }), { status: 201 }));
    });
    vi.stubGlobal("fetch", fetchMock); render(<WorkflowForm />); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Usar exemplo completo" }));
    await screen.findByDisplayValue("Novo cliente - Exemplo");
    await user.click(screen.getByRole("button", { name: "Criar fluxo visual" }));
    await waitFor(() => expect(created).toHaveLength(2));
    const onboarding = created[1] as { steps: Array<{ transitions: Array<{ description?: string }> }> };
    expect(onboarding.steps[0].transitions[1].description).toBe("workflow-link:cancellation:cancel-2");
  });

  it("liga visualmente um resultado a outra atividade por arrastar e soltar", async () => {
    render(<WorkflowForm />); const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "+ Nova atividade" }));
    await user.click(screen.getByRole("button", { name: /Configurar etapa 1/ }));
    const target = screen.getByRole("button", { name: /Configurar etapa 2/ });
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: vi.fn(() => target) });
    fireEvent.pointerDown(screen.getAllByRole("button", { name: "Ligar resultado Concluir" })[0], { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 300, clientY: 100, pointerId: 1 });
    await waitFor(() => expect((screen.getByLabelText("Destino do resultado 1") as HTMLSelectElement).value).toBe(`local:${(target as HTMLElement).dataset.stepId}`));
  });
});
