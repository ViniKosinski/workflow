import { describe, expect, it, vi } from "vitest";
import { createOrganizationAuthorizationGuard } from "@/modules/authorization/application/organizationAuthorizationGuard";
import { ORGANIZATION_PERMISSIONS, OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";

describe("organization authorization guard", () => {
  it("memoiza o membership somente na instância atual", async () => {
    const find = vi.fn(async () => ({
      organizationId: "org",
      userId: "user",
      role: "owner" as const,
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt: "2026-07-22T00:00:00.000Z",
    }));
    const guard = createOrganizationAuthorizationGuard({ find } as never, new OrganizationAuthorizationService(), "user", "org");

    await guard.require(ORGANIZATION_PERMISSIONS.workflowRead);
    await guard.require(ORGANIZATION_PERMISSIONS.workflowExecutionManage);

    expect(find).toHaveBeenCalledTimes(1);

    const secondGuard = createOrganizationAuthorizationGuard({ find } as never, new OrganizationAuthorizationService(), "user", "org");
    await secondGuard.require(ORGANIZATION_PERMISSIONS.workflowRead);
    expect(find).toHaveBeenCalledTimes(2);
  });
});
