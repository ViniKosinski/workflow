import { OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { PrismaUserRepository } from "@/modules/auth/infrastructure/prismaUserRepository";
import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { PrismaOrganizationRepository } from "@/modules/organizations/infrastructure/prismaOrganizationRepository";
import { PrismaMembershipTransactionManager } from "@/modules/organizations/infrastructure/prismaMembershipTransactionManager";

export const organizationDependencies: OrganizationApplicationDependencies = {
  organizations: new PrismaOrganizationRepository(),
  memberships: new PrismaMembershipRepository(),
  membershipTransactions: new PrismaMembershipTransactionManager(),
  users: new PrismaUserRepository(),
  authorization: new OrganizationAuthorizationService(),
  clock: { now: () => new Date() },
  ids: { createOrganizationId: () => crypto.randomUUID() },
};
