import { describe, expect, it } from "vitest";
import {
  AuthorizationDeniedError,
  ORGANIZATION_PERMISSIONS,
  OrganizationAuthorizationService,
} from "@/modules/authorization/domain/authorization";
import { ORGANIZATION_ROLES } from "@/modules/organizations/domain/membership";

describe("OrganizationAuthorizationService", () => {
  const service = new OrganizationAuthorizationService();

  it.each([
    [ORGANIZATION_ROLES.owner, Object.values(ORGANIZATION_PERMISSIONS)],
    [ORGANIZATION_ROLES.admin, Object.values(ORGANIZATION_PERMISSIONS)],
    [ORGANIZATION_ROLES.editor, [
      "organization.read", "membership.read", "workflow.read", "workflow.create",
      "workflow.definition.update", "workflow.execution.manage",
    ]],
    [ORGANIZATION_ROLES.viewer, ["organization.read", "membership.read", "workflow.read"]],
  ] as const)("aplica a matriz completa para %s", (role, expected) => {
    expect(service.permissionsFor(role)).toEqual(expected);
    for (const permission of Object.values(ORGANIZATION_PERMISSIONS)) {
      expect(service.allows(role, permission)).toBe(expected.includes(permission as never));
    }
  });

  it("impede ADMIN de criar ou gerenciar ADMIN e protege OWNER", () => {
    expect(() => service.requireInvitation("admin", "admin")).toThrow(AuthorizationDeniedError);
    expect(() => service.requireRoleChange("admin", "admin", "viewer")).toThrow(AuthorizationDeniedError);
    expect(() => service.requireRoleChange("owner", "owner", "admin")).toThrow(AuthorizationDeniedError);
    expect(() => service.requireRemoval("owner", "owner")).toThrow(AuthorizationDeniedError);
  });

  it("permite OWNER gerenciar papéis não proprietários", () => {
    expect(() => service.requireInvitation("owner", "admin")).not.toThrow();
    expect(() => service.requireRoleChange("owner", "admin", "editor")).not.toThrow();
    expect(() => service.requireRemoval("owner", "admin")).not.toThrow();
  });
});
