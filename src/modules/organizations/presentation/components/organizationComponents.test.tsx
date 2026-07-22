import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { OrganizationList } from "@/modules/organizations/presentation/components/OrganizationList";
import { OrganizationMemberRow } from "@/modules/organizations/presentation/components/OrganizationMemberRow";
import { OrganizationRoleBadge } from "@/modules/organizations/presentation/components/OrganizationRoleBadge";

describe("organization components", () => {
  it("renderiza lista e estado vazio", () => {
    expect(renderToStaticMarkup(createElement(OrganizationList, { organizations: [] }))).toContain("nenhuma organização");
    const html = renderToStaticMarkup(createElement(OrganizationList, { organizations: [{ id: "org-1", name: "Produto", createdAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-22T00:00:00.000Z" }] }));
    expect(html).toContain("Produto");
    expect(html).toContain("/organizations/org-1");
  });

  it("renderiza badges dos papéis", () => {
    expect(renderToStaticMarkup(createElement(OrganizationRoleBadge, { role: "owner" }))).toContain("Owner");
    expect(renderToStaticMarkup(createElement(OrganizationRoleBadge, { role: "viewer" }))).toContain("Viewer");
  });

  it("oculta ações conforme as capacidades retornadas pela API", () => {
    const base = { organizationId: "org", userId: "user", role: "owner" as const, createdAt: "now", updatedAt: "now", user: { name: "Ana", email: "ana@example.com" } };
    const protectedHtml = renderToStaticMarkup(createElement("table", null, createElement("tbody", null, createElement(OrganizationMemberRow, { member: { ...base, actions: { assignableRoles: [], canRemove: false } }, onChanged: vi.fn() }))));
    expect(protectedHtml).toContain("Sem ações disponíveis");
    expect(protectedHtml).not.toContain("Remover");
    const actionableHtml = renderToStaticMarkup(createElement("table", null, createElement("tbody", null, createElement(OrganizationMemberRow, { member: { ...base, role: "viewer", actions: { assignableRoles: ["editor"], canRemove: true } }, onChanged: vi.fn() }))));
    expect(actionableHtml).toContain("Alterar papel");
    expect(actionableHtml).toContain("Remover");
  });
});
