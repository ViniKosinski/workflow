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
  const role = parseAssignableRole(input.role);
  return dependencies.membershipTransactions.run(async (memberships) => {
    const [actor, target] = await Promise.all([
      memberships.find(organizationId, actorUserId),
      memberships.find(organizationId, targetUserId),
    ]);
    if (!actor) throw new OrganizationNotFoundError();
    if (!target) throw new MembershipNotFoundError();
    dependencies.authorization.requireRoleChange(actor.role, target.role, role);
    return memberships.updateRole(organizationId, targetUserId, role, dependencies.clock.now().toISOString());
  });
}
