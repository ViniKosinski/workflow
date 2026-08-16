import { describe, expect, it, vi } from "vitest";
import { AuthorizationDeniedError, OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { getOperationalDashboard, parseDashboardPeriod } from "@/modules/dashboard/application/operationalDashboard";

const dashboard = { organizationId: "org", pendingTasks: 2, runningTasks: 1, activeRuns: 3, completedRuns: 4, tasksByStatus: [], runsByWorkflow: [], oldestTasks: [] };

function dependencies(role: "owner" | "admin" | "editor" | "viewer" | null) {
  const getOrganization = vi.fn().mockResolvedValue(dashboard);
  return {
    getOrganization,
    value: {
      repository: { getOrganization },
      memberships: { find: vi.fn().mockResolvedValue(role ? { organizationId: "org", userId: "actor", role } : null) },
      authorization: new OrganizationAuthorizationService(),
    },
  };
}

describe("getOperationalDashboard", () => {
  it.each(["owner", "admin"] as const)("permite a visão operacional para %s", async (role) => {
    const fixture = dependencies(role);
    const now = new Date("2026-08-15T12:00:00.000Z");
    await expect(getOperationalDashboard(fixture.value as never, "actor", "org", 7, now)).resolves.toEqual(dashboard);
    expect(fixture.getOrganization).toHaveBeenCalledWith("org", 7, new Date("2026-08-09T00:00:00.000Z"), now);
  });

  it.each(["editor", "viewer"] as const)("nega a visão operacional para %s", async (role) => {
    const fixture = dependencies(role);
    await expect(getOperationalDashboard(fixture.value as never, "actor", "org")).rejects.toBeInstanceOf(AuthorizationDeniedError);
    expect(fixture.getOrganization).not.toHaveBeenCalled();
  });

  it("aceita apenas os períodos suportados", () => {
    expect(parseDashboardPeriod("7")).toBe(7);
    expect(parseDashboardPeriod("90")).toBe(90);
    expect(parseDashboardPeriod("30")).toBe(30);
    expect(parseDashboardPeriod("invalid")).toBe(30);
  });
});
