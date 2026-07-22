import { afterEach, describe, expect, it, vi } from "vitest";
import { organizationClient } from "@/modules/organizations/presentation/api/organizationClient";

describe("organizationClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("cria organização usando exclusivamente a API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ organization: { id: "org-1", name: "Produto", createdAt: "now", updatedAt: "now" } }), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(organizationClient.create("Produto")).resolves.toMatchObject({ id: "org-1" });
    expect(fetchMock).toHaveBeenCalledWith("/api/organizations", expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "Produto" }) }));
  });

  it("executa interações de membro nas rotas existentes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await organizationClient.removeMember("org-1", "user-1");
    expect(fetchMock).toHaveBeenCalledWith("/api/organizations/org-1/members/user-1", { method: "DELETE" });
  });

  it("propaga mensagem amigável da API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Você não possui permissão." }), { status: 403 })));
    await expect(organizationClient.members("org-1")).rejects.toThrow("Você não possui permissão.");
  });
});
