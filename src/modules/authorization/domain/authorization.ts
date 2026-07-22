import { ORGANIZATION_ROLES, type OrganizationRole } from "@/modules/organizations/domain/membership";

export const ORGANIZATION_PERMISSIONS = {
  organizationRead: "organization.read",
  organizationUpdate: "organization.update",
  membershipRead: "membership.read",
  membershipAdd: "membership.add",
  membershipChangeRole: "membership.changeRole",
  membershipRemove: "membership.remove",
  workflowRead: "workflow.read",
  workflowCreate: "workflow.create",
  workflowDefinitionUpdate: "workflow.definition.update",
  workflowExecutionManage: "workflow.execution.manage",
} as const;

export type OrganizationPermission = (typeof ORGANIZATION_PERMISSIONS)[keyof typeof ORGANIZATION_PERMISSIONS];

const ALL_PERMISSIONS = Object.values(ORGANIZATION_PERMISSIONS);
const EDITOR_PERMISSIONS: ReadonlyArray<OrganizationPermission> = [
  ORGANIZATION_PERMISSIONS.organizationRead,
  ORGANIZATION_PERMISSIONS.membershipRead,
  ORGANIZATION_PERMISSIONS.workflowRead,
  ORGANIZATION_PERMISSIONS.workflowCreate,
  ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate,
  ORGANIZATION_PERMISSIONS.workflowExecutionManage,
];

export const ROLE_PERMISSION_MATRIX: Readonly<Record<OrganizationRole, ReadonlyArray<OrganizationPermission>>> = {
  [ORGANIZATION_ROLES.owner]: ALL_PERMISSIONS,
  [ORGANIZATION_ROLES.admin]: ALL_PERMISSIONS,
  [ORGANIZATION_ROLES.editor]: EDITOR_PERMISSIONS,
  [ORGANIZATION_ROLES.viewer]: [
    ORGANIZATION_PERMISSIONS.organizationRead,
    ORGANIZATION_PERMISSIONS.membershipRead,
    ORGANIZATION_PERMISSIONS.workflowRead,
  ],
};

export class AuthorizationDeniedError extends Error {
  constructor() {
    super("Você não possui permissão para realizar esta ação.");
    this.name = "AuthorizationDeniedError";
  }
}

export class OrganizationAuthorizationService {
  allows(role: OrganizationRole, permission: OrganizationPermission) {
    return ROLE_PERMISSION_MATRIX[role].includes(permission);
  }

  require(role: OrganizationRole, permission: OrganizationPermission) {
    if (!this.allows(role, permission)) throw new AuthorizationDeniedError();
  }

  requireAddition(actorRole: OrganizationRole, addedRole: OrganizationRole) {
    this.require(actorRole, ORGANIZATION_PERMISSIONS.membershipAdd);
    if (addedRole === ORGANIZATION_ROLES.owner) throw new AuthorizationDeniedError();
    if (actorRole === ORGANIZATION_ROLES.admin && addedRole === ORGANIZATION_ROLES.admin) {
      throw new AuthorizationDeniedError();
    }
  }

  requireRoleChange(actorRole: OrganizationRole, currentRole: OrganizationRole, nextRole: OrganizationRole) {
    this.require(actorRole, ORGANIZATION_PERMISSIONS.membershipChangeRole);
    if (currentRole === ORGANIZATION_ROLES.owner || nextRole === ORGANIZATION_ROLES.owner) {
      throw new AuthorizationDeniedError();
    }
    if (actorRole === ORGANIZATION_ROLES.admin &&
      (currentRole === ORGANIZATION_ROLES.admin || nextRole === ORGANIZATION_ROLES.admin)) {
      throw new AuthorizationDeniedError();
    }
  }

  requireRemoval(actorRole: OrganizationRole, targetRole: OrganizationRole) {
    this.require(actorRole, ORGANIZATION_PERMISSIONS.membershipRemove);
    if (targetRole === ORGANIZATION_ROLES.owner) throw new AuthorizationDeniedError();
    if (actorRole === ORGANIZATION_ROLES.admin && targetRole === ORGANIZATION_ROLES.admin) {
      throw new AuthorizationDeniedError();
    }
  }

  permissionsFor(role: OrganizationRole) {
    return ROLE_PERMISSION_MATRIX[role];
  }

  memberActionsFor(actorRole: OrganizationRole, targetRole: OrganizationRole) {
    const assignableRoles = ([ORGANIZATION_ROLES.admin, ORGANIZATION_ROLES.editor, ORGANIZATION_ROLES.viewer] as const)
      .filter((role) => role !== targetRole)
      .filter((role) => {
        try { this.requireRoleChange(actorRole, targetRole, role); return true; } catch { return false; }
      });
    let canRemove = true;
    try { this.requireRemoval(actorRole, targetRole); } catch { canRemove = false; }
    return { assignableRoles, canRemove } as const;
  }
}
