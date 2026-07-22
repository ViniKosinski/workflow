import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";
import { authorizeOrganizationAction } from "@/modules/organizations/application/authorizeOrganizationAction";
import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";

export async function listOrganizationMembers(dependencies: OrganizationApplicationDependencies, actorUserId: string, organizationId: string) {
  const actor = await authorizeOrganizationAction(dependencies, actorUserId, organizationId, ORGANIZATION_PERMISSIONS.membershipRead);
  const members = await dependencies.memberships.list(organizationId);
  return members.map((membership) => ({
    ...membership,
    actions: dependencies.authorization.memberActionsFor(actor.role, membership.role),
  }));
}
