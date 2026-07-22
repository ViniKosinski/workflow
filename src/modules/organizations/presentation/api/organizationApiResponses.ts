import { NextResponse } from "next/server";
import { AuthorizationDeniedError } from "@/modules/authorization/domain/authorization";
import { UnauthenticatedError } from "@/modules/auth/application/authErrors";
import { MembershipDomainError } from "@/modules/organizations/domain/membership";
import { OrganizationDomainError } from "@/modules/organizations/domain/organization";
import {
  MemberUserNotFoundError,
  MembershipAlreadyExistsError,
  MembershipNotFoundError,
  OrganizationNotFoundError,
} from "@/modules/organizations/application/organizationErrors";
import { logServerError } from "@/shared/infrastructure/observability/logServerError";
import { HttpRequestError } from "@/shared/presentation/api/httpRequest";

export function organizationJsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function organizationErrorResponse(error: unknown) {
  if (error instanceof HttpRequestError) return NextResponse.json({ message: error.message }, { status: error.status });
  if (error instanceof UnauthenticatedError) return NextResponse.json({ message: error.message }, { status: 401 });
  if (error instanceof AuthorizationDeniedError) return NextResponse.json({ message: error.message }, { status: 403 });
  if (error instanceof OrganizationNotFoundError || error instanceof MembershipNotFoundError || error instanceof MemberUserNotFoundError) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }
  if (error instanceof MembershipAlreadyExistsError) return NextResponse.json({ message: error.message }, { status: 409 });
  if (error instanceof MembershipDomainError || error instanceof OrganizationDomainError) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  logServerError("organization.request.failed", error);
  return NextResponse.json({ message: "Não foi possível processar a solicitação." }, { status: 500 });
}
