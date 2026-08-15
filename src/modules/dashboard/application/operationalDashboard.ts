import { ORGANIZATION_PERMISSIONS, type OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";
import type { MembershipRepository } from "@/modules/organizations/domain/membershipRepository";

export type OperationalDashboard = Readonly<{
  organizationId: string;
  pendingTasks: number;
  runningTasks: number;
  activeRuns: number;
  completedRuns: number;
  tasksByStatus: ReadonlyArray<Readonly<{ status: "pending" | "running" | "completed"; count: number }>>;
  runsByWorkflow: ReadonlyArray<Readonly<{ workflowDefinitionId: string; workflowName: string; total: number; active: number; completed: number }>>;
  oldestTasks: ReadonlyArray<Readonly<{
    id: string;
    name: string;
    workflowName: string;
    assigneeName: string;
    status: "pending" | "running";
    updatedAt: string;
  }>>;
}>;

export type OperationalDashboardRepository = Readonly<{
  getOrganization: (organizationId: string) => Promise<OperationalDashboard>;
}>;

type Dependencies = Readonly<{
  repository: OperationalDashboardRepository;
  memberships: MembershipRepository;
  authorization: OrganizationAuthorizationService;
}>;

export async function getOperationalDashboard(dependencies: Dependencies, actorUserId: string, organizationId: string) {
  const membership = await dependencies.memberships.find(organizationId, actorUserId);
  if (!membership) throw new OrganizationNotFoundError();
  dependencies.authorization.require(membership.role, ORGANIZATION_PERMISSIONS.dashboardOrganizationRead);
  return dependencies.repository.getOrganization(organizationId);
}
