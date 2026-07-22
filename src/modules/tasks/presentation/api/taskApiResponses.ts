import { NextResponse } from "next/server";
import { TaskNotFoundError } from "@/modules/tasks/domain/task";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

export function taskErrorResponse(error: unknown) {
  if (error instanceof TaskNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 });
  return workflowErrorResponse(error);
}
