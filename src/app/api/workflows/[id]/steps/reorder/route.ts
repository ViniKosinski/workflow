import { reorderWorkflowSteps } from "@/modules/workflows/application/reorderWorkflowSteps";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";
import { parseReorderPayload } from "@/modules/workflows/presentation/api/workflowRequestPayloads";

type ReorderWorkflowStepsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: ReorderWorkflowStepsRouteContext,
) {
  try {
    const { id } = await context.params;
    const { dependencies } = await getWorkflowRequestContext(request);
    const payload = await parseReorderPayload(request);
    const workflow = await reorderWorkflowSteps(dependencies, {
      workflowId: id,
      orderedStepIds: payload.orderedStepIds,
    });

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
