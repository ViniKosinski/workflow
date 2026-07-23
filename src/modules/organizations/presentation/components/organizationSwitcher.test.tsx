// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActiveOrganizationProvider } from "@/modules/organizations/presentation/components/ActiveOrganizationProvider";
import { OrganizationSwitcher } from "@/modules/organizations/presentation/components/OrganizationSwitcher";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("OrganizationSwitcher", () => {
  it("fica visível e apresenta erro amigável quando a troca falha", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ organizations: [{ id: "o1", name: "Org 1" }, { id: "o2", name: "Org 2" }] }) })
      .mockResolvedValueOnce({ json: async () => ({ organizationId: "o1" }) })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    render(<ActiveOrganizationProvider><OrganizationSwitcher /></ActiveOrganizationProvider>);
    const select = await screen.findByRole("combobox", { name: "Organização ativa" });
    expect(select.className).not.toContain("sr-only");
    await userEvent.selectOptions(select, "o2");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Não foi possível trocar"));
  });
});
