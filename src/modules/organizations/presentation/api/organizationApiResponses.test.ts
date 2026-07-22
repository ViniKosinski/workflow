import { describe, expect, it } from "vitest";
import { AuthorizationDeniedError } from "@/modules/authorization/domain/authorization";
import { UnauthenticatedError } from "@/modules/auth/application/authErrors";
import { OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";
import { organizationErrorResponse } from "@/modules/organizations/presentation/api/organizationApiResponses";
import { MembershipConcurrencyError } from "@/modules/organizations/domain/membershipTransaction";

describe("organization API responses", () => {
  it.each([
    [new UnauthenticatedError(), 401],
    [new AuthorizationDeniedError(), 403],
    [new OrganizationNotFoundError(), 404],
    [new MembershipConcurrencyError(), 409],
  ])("mapeia %s para HTTP %i", (error, status) => {
    expect(organizationErrorResponse(error).status).toBe(status);
  });
});
