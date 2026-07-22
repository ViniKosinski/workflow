import type { OrganizationPermission } from "@/modules/authorization/domain/authorization";
import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";
import { OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";

export async function authorizeOrganizationAction(
  dependencies: OrganizationApplicationDependencies,
  actorUserId: string,
  organizationId: string,
  permission: OrganizationPermission,
) {
  const membership = await dependencies.memberships.find(organizationId, actorUserId);
  if (!membership) throw new OrganizationNotFoundError();
  dependencies.authorization.require(membership.role, permission);
  return membership;
}
