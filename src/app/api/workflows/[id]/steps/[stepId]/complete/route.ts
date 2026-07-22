import { completePersistedWorkflowStep } from "@/modules/workflows/application/completePersistedWorkflowStep";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";
import { parseCompletionPayload } from "@/modules/workflows/presentation/api/workflowRequestPayloads";

type WorkflowStepRouteContext = {
  params: Promise<{
    id: string;
    stepId: string;
  }>;
};

export async function POST(
  request: Request,
  context: WorkflowStepRouteContext,
) {
  try {
    const { id, stepId } = await context.params;
    const { dependencies } = await getWorkflowRequestContext(request);
    const body = await parseCompletionPayload(request);
    const workflow = await completePersistedWorkflowStep(
      dependencies,
      {
        workflowId: id,
        stepId,
        result: {
          message: body.message,
        },
      },
    );

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
