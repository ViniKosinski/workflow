export type OrganizationRole = "owner" | "admin" | "editor" | "viewer";

export type OrganizationView = Readonly<{
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}>;

export type OrganizationMemberView = Readonly<{
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
  user?: Readonly<{ email: string; name: string }>;
  actions: Readonly<{ assignableRoles: ReadonlyArray<Exclude<OrganizationRole, "owner">>; canRemove: boolean }>;
}>;

export type OrganizationAuthorizationView = Readonly<{
  role: OrganizationRole;
  permissions: ReadonlyArray<string>;
}>;

export type ApiError = Readonly<{ message?: string }>;
