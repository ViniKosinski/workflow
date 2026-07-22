import { removeWorkflowStep } from "@/modules/workflows/application/removeWorkflowStep";
import { renameWorkflowStep } from "@/modules/workflows/application/renameWorkflowStep";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";
import { parseStepNamePayload } from "@/modules/workflows/presentation/api/workflowRequestPayloads";

type WorkflowStepRouteContext = {
  params: Promise<{
    id: string;
    stepId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: WorkflowStepRouteContext,
) {
  try {
    const { id, stepId } = await context.params;
    const { dependencies } = await getWorkflowRequestContext(request);
    const payload = await parseStepNamePayload(request);
    const workflow = await renameWorkflowStep(dependencies, {
      workflowId: id,
      stepId,
      name: payload.name,
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
    const workflow = await removeWorkflowStep((await getWorkflowRequestContext(_request)).dependencies, {
      workflowId: id,
      stepId,
    });

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
