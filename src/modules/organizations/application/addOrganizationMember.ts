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
  const actor = await dependencies.memberships.find(organizationId, actorUserId);
  if (!actor) throw new OrganizationNotFoundError();
  const role = parseAssignableRole(input.role);
  dependencies.authorization.requireAddition(actor.role, role);
  const found = await dependencies.users.findByNormalizedEmail(normalizeEmail(input.email));
  if (!found || found.user.status !== "active") throw new MemberUserNotFoundError();
  if (await dependencies.memberships.find(organizationId, found.user.id)) throw new MembershipAlreadyExistsError();
  const now = dependencies.clock.now().toISOString();
  try {
    return await dependencies.memberships.create({
      organizationId,
      userId: found.user.id,
      role,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (await dependencies.memberships.find(organizationId, found.user.id)) {
      throw new MembershipAlreadyExistsError();
    }
    throw error;
  }
}
