import { removeWorkflowStep } from "@/modules/workflows/application/removeWorkflowStep";
import { renameWorkflowStep } from "@/modules/workflows/application/renameWorkflowStep";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { workflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";

type WorkflowStepRouteContext = {
  params: Promise<{
    id: string;
    stepId: string;
  }>;
};

type RenameWorkflowStepPayload = {
  name?: string;
};

export async function PATCH(
  request: Request,
  context: WorkflowStepRouteContext,
) {
  try {
    const { id, stepId } = await context.params;
    const payload = (await request.json()) as RenameWorkflowStepPayload;
    const workflow = await renameWorkflowStep(workflowPersistenceDependencies, {
      workflowId: id,
      stepId,
      name: payload.name ?? "",
    });

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: WorkflowStepRouteContext,
) {
  try {
    const { id, stepId } = await context.params;
    const workflow = await removeWorkflowStep(workflowPersistenceDependencies, {
      workflowId: id,
      stepId,
    });

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
