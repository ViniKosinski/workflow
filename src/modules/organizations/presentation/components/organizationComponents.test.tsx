// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { organizationClient } from "@/modules/organizations/presentation/api/organizationClient";
import { AddMemberForm } from "@/modules/organizations/presentation/components/AddMemberForm";
import { ChangeRoleForm } from "@/modules/organizations/presentation/components/ChangeRoleForm";
import { OrganizationList } from "@/modules/organizations/presentation/components/OrganizationList";
import { OrganizationMemberRow } from "@/modules/organizations/presentation/components/OrganizationMemberRow";
import { OrganizationRoleBadge } from "@/modules/organizations/presentation/components/OrganizationRoleBadge";
import { RemoveMemberDialog } from "@/modules/organizations/presentation/components/RemoveMemberDialog";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("organization components", () => {
  it("renderiza lista, estado vazio e papéis", () => {
    const { rerender } = render(<OrganizationList organizations={[]} />);
    expect(screen.getByText(/nenhuma organização/i)).toBeTruthy();
    rerender(<OrganizationList organizations={[{ id: "org-1", name: "Produto", createdAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-22T00:00:00.000Z" }]} />);
    expect(screen.getByRole("link", { name: /produto/i }).getAttribute("href")).toBe("/organizations/org-1");
    rerender(<OrganizationRoleBadge role="viewer" />);
    expect(screen.getByText("Viewer")).toBeTruthy();
  });

  it("oculta ações conforme capabilities retornadas pela API", () => {
    const base = { organizationId: "org", userId: "user", role: "owner" as const, createdAt: "now", updatedAt: "now", user: { name: "Ana", email: "ana@example.com" } };
    const { rerender } = render(<table><tbody><OrganizationMemberRow member={{ ...base, actions: { assignableRoles: [], canRemove: false } }} onChanged={vi.fn()} /></tbody></table>);
    expect(screen.getByText(/sem ações disponíveis/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /remover/i })).toBeNull();
    rerender(<table><tbody><OrganizationMemberRow member={{ ...base, role: "viewer", actions: { assignableRoles: ["editor"], canRemove: true } }} onChanged={vi.fn()} /></tbody></table>);
    expect(screen.getByRole("combobox", { name: /alterar papel/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /remover/i })).toBeTruthy();
  });

  it("submete membro, mostra loading e atualiza após sucesso", async () => {
    let resolve!: () => void;
    vi.spyOn(organizationClient, "addMember").mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
    const onChanged = vi.fn();
    render(<AddMemberForm onChanged={onChanged} organizationId="org" roles={["viewer"]} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-mail"), "member@example.com");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(screen.getByRole("button", { name: "Adicionando..." })).toBeTruthy();
    resolve();
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
    expect(screen.getByText(/membro adicionado com sucesso/i)).toBeTruthy();
  });

  it("exibe erro de submissão sem atualizar", async () => {
    vi.spyOn(organizationClient, "addMember").mockRejectedValue(new Error("Sem permissão"));
    const onChanged = vi.fn();
    render(<AddMemberForm onChanged={onChanged} organizationId="org" roles={["viewer"]} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-mail"), "member@example.com");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(await screen.findByText("Sem permissão")).toBeTruthy();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("confirma remoção antes de chamar a API e atualiza", async () => {
    vi.spyOn(organizationClient, "removeMember").mockResolvedValue(undefined);
    const onChanged = vi.fn();
    render(<RemoveMemberDialog memberName="Ana" onChanged={onChanged} organizationId="org" userId="user" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.getByText("Remover Ana?")).toBeTruthy();
    expect(organizationClient.removeMember).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(organizationClient.removeMember).toHaveBeenCalledWith("org", "user"));
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it("altera papel e solicita refresh", async () => {
    vi.spyOn(organizationClient, "changeRole").mockResolvedValue(undefined);
    const onChanged = vi.fn();
    render(<ChangeRoleForm currentRole="viewer" onChanged={onChanged} organizationId="org" roles={["editor"]} userId="user" />);
    await userEvent.setup().selectOptions(screen.getByRole("combobox", { name: /alterar papel/i }), "editor");
    await waitFor(() => expect(organizationClient.changeRole).toHaveBeenCalledWith("org", "user", "editor"));
    expect(onChanged).toHaveBeenCalledOnce();
  });
});
