import { normalizeEmail } from "@/modules/auth/domain/user";
import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";
import { MembershipAlreadyExistsError, MemberUserNotFoundError, OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";
import { parseAssignableRole, type OrganizationRole } from "@/modules/organizations/domain/membership";

export async function addOrganizationMember(
  dependencies: OrganizationApplicationDependencies,
  actorUserId: string,
  organizationId: string,
  input: Readonly<{ email: string; role: OrganizationRole }>,
) {
  const role = parseAssignableRole(input.role);
  const found = await dependencies.users.findByNormalizedEmail(normalizeEmail(input.email));
  if (!found || found.user.status !== "active") throw new MemberUserNotFoundError();
  const now = dependencies.clock.now().toISOString();
  try {
    return await dependencies.membershipTransactions.run(async (memberships) => {
      const actor = await memberships.find(organizationId, actorUserId);
      if (!actor) throw new OrganizationNotFoundError();
      dependencies.authorization.requireAddition(actor.role, role);
      if (await memberships.find(organizationId, found.user.id)) throw new MembershipAlreadyExistsError();
      return memberships.create({ organizationId, userId: found.user.id, role, createdAt: now, updatedAt: now });
    });
  } catch (error) {
    if (await dependencies.memberships.find(organizationId, found.user.id)) {
      throw new MembershipAlreadyExistsError();
    }
    throw error;
  }
}
