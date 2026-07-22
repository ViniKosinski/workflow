import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";
import { MembershipNotFoundError, OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";
import { parseAssignableRole, type OrganizationRole } from "@/modules/organizations/domain/membership";

export async function changeOrganizationMemberRole(
  dependencies: OrganizationApplicationDependencies,
  actorUserId: string,
  organizationId: string,
  targetUserId: string,
  input: Readonly<{ role: OrganizationRole }>,
) {
  const [actor, target] = await Promise.all([
    dependencies.memberships.find(organizationId, actorUserId),
    dependencies.memberships.find(organizationId, targetUserId),
  ]);
  if (!actor) throw new OrganizationNotFoundError();
  if (!target) throw new MembershipNotFoundError();
  const role = parseAssignableRole(input.role);
  dependencies.authorization.requireRoleChange(actor.role, target.role, role);
  return dependencies.memberships.updateRole(organizationId, targetUserId, role, dependencies.clock.now().toISOString());
}
