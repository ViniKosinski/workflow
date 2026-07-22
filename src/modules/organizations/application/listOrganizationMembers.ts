import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";
import { authorizeOrganizationAction } from "@/modules/organizations/application/authorizeOrganizationAction";
import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";

export async function listOrganizationMembers(dependencies: OrganizationApplicationDependencies, actorUserId: string, organizationId: string) {
  await authorizeOrganizationAction(dependencies, actorUserId, organizationId, ORGANIZATION_PERMISSIONS.membershipRead);
  return dependencies.memberships.list(organizationId);
}
