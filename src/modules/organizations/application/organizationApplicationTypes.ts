import type { OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import type { UserRepository } from "@/modules/auth/domain/userRepository";
import type { MembershipRepository } from "@/modules/organizations/domain/membershipRepository";
import type { OrganizationRepository } from "@/modules/organizations/domain/organizationRepository";
import type { MembershipTransactionManager } from "@/modules/organizations/domain/membershipTransaction";

export type OrganizationApplicationDependencies = Readonly<{
  organizations: OrganizationRepository;
  memberships: MembershipRepository;
  membershipTransactions: MembershipTransactionManager;
  users: UserRepository;
  authorization: OrganizationAuthorizationService;
  clock: Readonly<{ now: () => Date }>;
  ids: Readonly<{ createOrganizationId: () => string }>;
}>;
