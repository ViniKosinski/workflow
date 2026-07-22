import { NextResponse } from "next/server";
import {
  AuthValidationError,
  InvalidCredentialsError,
  UnauthenticatedError,
} from "@/modules/auth/application/authErrors";
import { HttpRequestError } from "@/shared/presentation/api/httpRequest";
import { logServerError } from "@/shared/infrastructure/observability/logServerError";

export function authErrorResponse(error: unknown) {
  if (error instanceof HttpRequestError) {
    return NextResponse.json({ message: error.message }, { status: error.status, headers: error.headers });
  }
  if (error instanceof AuthValidationError) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  if (error instanceof InvalidCredentialsError || error instanceof UnauthenticatedError) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }
  logServerError("auth.request.failed", error);
  return NextResponse.json({ message: "Não foi possível processar a solicitação." }, { status: 500 });
}
