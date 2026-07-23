import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";
import { MembershipNotFoundError, OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";
import { ActiveTaskAssignmentError } from "@/modules/organizations/domain/membership";

export async function removeOrganizationMember(
  dependencies: OrganizationApplicationDependencies,
  actorUserId: string,
  organizationId: string,
  targetUserId: string,
) {
  await dependencies.membershipTransactions.run(async (memberships) => {
    const [actor, target] = await Promise.all([
      memberships.find(organizationId, actorUserId),
      memberships.find(organizationId, targetUserId),
    ]);
    if (!actor) throw new OrganizationNotFoundError();
    if (!target) throw new MembershipNotFoundError();
    dependencies.authorization.requireRemoval(actor.role, target.role);
    if (await memberships.hasActiveTasksAssigned(organizationId, targetUserId)) throw new ActiveTaskAssignmentError();
    await memberships.remove(organizationId, targetUserId);
  });
}
