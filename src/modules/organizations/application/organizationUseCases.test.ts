import { describe, expect, it, vi } from "vitest";
import { OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { changeOrganizationMemberRole } from "@/modules/organizations/application/changeOrganizationMemberRole";
import { checkOrganizationAuthorization } from "@/modules/organizations/application/checkOrganizationAuthorization";
import { createOrganization } from "@/modules/organizations/application/createOrganization";
import { addOrganizationMember } from "@/modules/organizations/application/addOrganizationMember";
import { listOrganizationMembers } from "@/modules/organizations/application/listOrganizationMembers";
import { removeOrganizationMember } from "@/modules/organizations/application/removeOrganizationMember";
import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";
import { ActiveTaskAssignmentError, type OrganizationMembership, type OrganizationRole } from "@/modules/organizations/domain/membership";
import { MembershipConcurrencyError } from "@/modules/organizations/domain/membershipTransaction";
import { OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";

function createDependencies(actorRole: OrganizationRole = "owner") {
  const memberships = new Map<string, OrganizationMembership>();
  const now = "2026-07-22T12:00:00.000Z";
  memberships.set("actor", { organizationId: "org", userId: "actor", role: actorRole, createdAt: now, updatedAt: now });
  const dependencies: OrganizationApplicationDependencies = {
    organizations: {
      createWithOwner: vi.fn(async ({ organization, ownerMembership }) => { memberships.set(ownerMembership.userId, ownerMembership); return organization; }),
      findById: vi.fn(async (id) => id === "org" ? { id, name: "Org", createdAt: now, updatedAt: now } : null),
      listByUserId: vi.fn(async () => []),
    },
    memberships: {
      find: vi.fn(async (_organizationId, userId) => memberships.get(userId) ?? null),
      list: vi.fn(async () => [...memberships.values()]),
      create: vi.fn(async (membership) => { memberships.set(membership.userId, membership); return membership; }),
      updateRole: vi.fn(async (_organizationId, userId, role, updatedAt) => {
        const updated = { ...memberships.get(userId)!, role, updatedAt };
        memberships.set(userId, updated);
        return updated;
      }),
      remove: vi.fn(async (_organizationId, userId) => { memberships.delete(userId); }),
      hasActiveTasksAssigned: vi.fn(async () => false),
    },
    membershipTransactions: { run: vi.fn(async (work) => work(dependencies.memberships)) },
    users: {
      create: vi.fn(),
      findByNormalizedEmail: vi.fn(async (email) => email === "member@example.com" ? {
        user: { id: "member", email, name: "Member", status: "active" as const, createdAt: now, updatedAt: now },
        passwordHash: "hash",
      } : null),
      findCredentialByUserId: vi.fn(),
      updateName: vi.fn(),
      updatePasswordAndRevokeSessions: vi.fn(),
    },
    authorization: new OrganizationAuthorizationService(),
    clock: { now: () => new Date(now) },
    ids: { createOrganizationId: () => "org-created" },
  };
  return { dependencies, memberships };
}

describe("organization use cases", () => {
  it("cria organização e OWNER atomicamente pelo contrato", async () => {
    const { dependencies } = createDependencies();
    await expect(createOrganization(dependencies, "actor", { name: "  Nova Org  " })).resolves.toMatchObject({ id: "org-created", name: "Nova Org" });
    expect(dependencies.organizations.createWithOwner).toHaveBeenCalledWith(expect.objectContaining({ ownerMembership: expect.objectContaining({ role: "owner", userId: "actor" }) }));
  });

  it("OWNER adiciona, altera e remove membro", async () => {
    const { dependencies } = createDependencies();
    await addOrganizationMember(dependencies, "actor", "org", { email: "Member@Example.com", role: "admin" });
    await expect(changeOrganizationMemberRole(dependencies, "actor", "org", "member", { role: "editor" })).resolves.toMatchObject({ role: "editor" });
    await removeOrganizationMember(dependencies, "actor", "org", "member");
    await expect(listOrganizationMembers(dependencies, "actor", "org")).resolves.toHaveLength(1);
  });

  it("não remove membro com tarefa ativa atribuída", async () => {
    const { dependencies, memberships } = createDependencies();
    memberships.set("member", { organizationId: "org", userId: "member", role: "viewer", createdAt: "x", updatedAt: "x" });
    vi.mocked(dependencies.memberships.hasActiveTasksAssigned).mockResolvedValue(true);
    await expect(removeOrganizationMember(dependencies, "actor", "org", "member")).rejects.toBeInstanceOf(ActiveTaskAssignmentError);
    expect(dependencies.memberships.remove).not.toHaveBeenCalled();
  });

  it("ADMIN gerencia EDITOR, mas não ADMIN", async () => {
    const { dependencies, memberships } = createDependencies("admin");
    memberships.set("member", { organizationId: "org", userId: "member", role: "editor", createdAt: "x", updatedAt: "x" });
    await expect(changeOrganizationMemberRole(dependencies, "actor", "org", "member", { role: "viewer" })).resolves.toMatchObject({ role: "viewer" });
    await expect(changeOrganizationMemberRole(dependencies, "actor", "org", "member", { role: "admin" })).rejects.toThrow("permissão");
  });

  it.each(["editor", "viewer"] as const)("%s não gerencia membros", async (role) => {
    const { dependencies } = createDependencies(role);
    await expect(addOrganizationMember(dependencies, "actor", "org", { email: "member@example.com", role: "viewer" })).rejects.toThrow("permissão");
  });

  it("não consulta e-mail nem membership alvo quando actor não pertence à organização", async () => {
    const { dependencies, memberships } = createDependencies();
    memberships.delete("actor");
    memberships.set("member", { organizationId: "org", userId: "member", role: "viewer", createdAt: "x", updatedAt: "x" });
    await expect(addOrganizationMember(dependencies, "outsider", "org", { email: "member@example.com", role: "viewer" })).rejects.toBeInstanceOf(OrganizationNotFoundError);
    expect(dependencies.users.findByNormalizedEmail).not.toHaveBeenCalled();
    expect(dependencies.membershipTransactions.run).not.toHaveBeenCalled();
  });

  it("preserva erros de autorização e concorrência sem convertê-los em duplicidade", async () => {
    const { dependencies, memberships } = createDependencies();
    memberships.set("member", { organizationId: "org", userId: "member", role: "viewer", createdAt: "x", updatedAt: "x" });
    vi.spyOn(dependencies.membershipTransactions, "run").mockRejectedValue(new MembershipConcurrencyError());
    await expect(addOrganizationMember(dependencies, "actor", "org", { email: "member@example.com", role: "viewer" })).rejects.toBeInstanceOf(MembershipConcurrencyError);
  });

  it("retorna papel e capabilities pela autoridade central", async () => {
    const { dependencies } = createDependencies("viewer");
    await expect(checkOrganizationAuthorization(dependencies, "actor", "org")).resolves.toMatchObject({ role: "viewer", permissions: ["organization.read", "membership.read", "workflow.read", "team.read"] });
  });
});
