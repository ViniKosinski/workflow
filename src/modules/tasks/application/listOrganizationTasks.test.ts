import { describe, expect, it, vi } from "vitest";
import { AuthorizationDeniedError, OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { listOrganizationTasks } from "@/modules/tasks/application/listOrganizationTasks";

const query = { order: "desc" as const, page: 1, pageSize: 10 };

function dependencies(role: "owner" | "admin" | "editor" | "viewer" | null) {
  const listOrganization = vi.fn().mockResolvedValue({ tasks: [], page: 1, pageSize: 10, total: 0, totalPages: 0 });
  return {
    listOrganization,
    value: {
      tasks: { listOrganization, findInOrganization: vi.fn(), listHistory: vi.fn() },
      memberships: { find: vi.fn().mockResolvedValue(role ? { organizationId: "org", userId: "actor", role } : null) },
      organizationAuthorization: new OrganizationAuthorizationService(),
    },
  };
}

describe("listOrganizationTasks", () => {
  it.each(["owner", "admin"] as const)("permite acompanhamento para %s", async (role) => {
    const fixture = dependencies(role);
    await expect(listOrganizationTasks(fixture.value as never, "actor", "org", query)).resolves.toMatchObject({ total: 0 });
    expect(fixture.listOrganization).toHaveBeenCalledWith("org", query);
  });

  it.each(["editor", "viewer"] as const)("nega acompanhamento para %s", async (role) => {
    const fixture = dependencies(role);
    await expect(listOrganizationTasks(fixture.value as never, "actor", "org", query)).rejects.toBeInstanceOf(AuthorizationDeniedError);
    expect(fixture.listOrganization).not.toHaveBeenCalled();
  });
});
