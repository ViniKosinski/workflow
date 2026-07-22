import { OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { PrismaUserRepository } from "@/modules/auth/infrastructure/prismaUserRepository";
import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { PrismaOrganizationRepository } from "@/modules/organizations/infrastructure/prismaOrganizationRepository";

export const organizationDependencies: OrganizationApplicationDependencies = {
  organizations: new PrismaOrganizationRepository(),
  memberships: new PrismaMembershipRepository(),
  users: new PrismaUserRepository(),
  authorization: new OrganizationAuthorizationService(),
  clock: { now: () => new Date() },
  ids: { createOrganizationId: () => crypto.randomUUID() },
};
