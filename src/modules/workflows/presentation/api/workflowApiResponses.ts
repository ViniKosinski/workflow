import { NextResponse } from "next/server";
import {
  WorkflowBusinessError,
  WorkflowNotFoundError,
  WorkflowValidationError,
} from "@/modules/workflows/application/workflowUseCaseErrors";

export function workflowJsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function workflowErrorResponse(error: unknown) {
  if (error instanceof WorkflowValidationError) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (error instanceof WorkflowNotFoundError) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }

  if (error instanceof WorkflowBusinessError) {
    return NextResponse.json({ message: error.message }, { status: 409 });
  }

  return NextResponse.json(
    { message: "Não foi possível processar a solicitação." },
    { status: 500 },
  );
}
