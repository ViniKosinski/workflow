import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";
import { MembershipNotFoundError, OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";

export async function removeOrganizationMember(
  dependencies: OrganizationApplicationDependencies,
  actorUserId: string,
  organizationId: string,
  targetUserId: string,
) {
  const [actor, target] = await Promise.all([
    dependencies.memberships.find(organizationId, actorUserId),
    dependencies.memberships.find(organizationId, targetUserId),
  ]);
  if (!actor) throw new OrganizationNotFoundError();
  if (!target) throw new MembershipNotFoundError();
  dependencies.authorization.requireRemoval(actor.role, target.role);
  await dependencies.memberships.remove(organizationId, targetUserId);
}
