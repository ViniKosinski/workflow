// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ workflow: { id: "workflow-1" } }), { status: 201, headers: { "content-type": "application/json" } })); vi.stubGlobal("fetch", fetchMock);
    render(<WorkflowForm />); const user = userEvent.setup();
    await user.type(screen.getByLabelText("Nome do fluxo"), "Entrada de cliente");
    await user.click(screen.getByRole("button", { name: "Criar fluxo visual" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: "Entrada de cliente", steps: [{ name: "Primeira atividade", order: 1 }] });
    expect(push).toHaveBeenCalledWith("/workflows/workflow-1");
  });
});
