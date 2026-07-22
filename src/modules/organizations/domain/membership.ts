export const ORGANIZATION_ROLES = {
  owner: "owner",
  admin: "admin",
  editor: "editor",
  viewer: "viewer",
} as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[keyof typeof ORGANIZATION_ROLES];

export type OrganizationMembership = Readonly<{
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
  user?: Readonly<{ email: string; name: string }>;
}>;

export const ASSIGNABLE_MEMBERSHIP_ROLES = [
  ORGANIZATION_ROLES.admin,
  ORGANIZATION_ROLES.editor,
  ORGANIZATION_ROLES.viewer,
] as const;

export function parseAssignableRole(value: unknown): Exclude<OrganizationRole, "owner"> {
  if (!ASSIGNABLE_MEMBERSHIP_ROLES.includes(value as never)) {
    throw new MembershipDomainError("O papel informado não pode ser atribuído.");
  }
  return value as Exclude<OrganizationRole, "owner">;
}

export class MembershipDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembershipDomainError";
  }
}
