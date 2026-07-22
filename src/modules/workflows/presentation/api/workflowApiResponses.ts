import { NextResponse } from "next/server";
import { UnauthenticatedError } from "@/modules/auth/application/authErrors";
import {
  WorkflowBusinessError,
  WorkflowNotFoundError,
  WorkflowValidationError,
} from "@/modules/workflows/application/workflowUseCaseErrors";
import { HttpRequestError } from "@/shared/presentation/api/httpRequest";
import { logServerError } from "@/shared/infrastructure/observability/logServerError";

export function workflowJsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function workflowErrorResponse(error: unknown) {
  if (error instanceof HttpRequestError) {
    return NextResponse.json({ message: error.message }, { status: error.status, headers: error.headers });
  }
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }
  if (error instanceof WorkflowValidationError) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (error instanceof WorkflowNotFoundError) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }

  if (error instanceof WorkflowBusinessError) {
    return NextResponse.json({ message: error.message }, { status: 409 });
  }

  logServerError("workflow.request.failed", error);
  return NextResponse.json(
    { message: "Não foi possível processar a solicitação." },
    { status: 500 },
  );
}
