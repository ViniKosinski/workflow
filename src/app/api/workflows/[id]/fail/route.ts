import { registerPersistedWorkflowFailure } from "@/modules/workflows/application/registerPersistedWorkflowFailure";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";
import { parseFailurePayload } from "@/modules/workflows/presentation/api/workflowRequestPayloads";

type WorkflowRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: WorkflowRouteContext) {
  try {
    const { id } = await context.params;
    const { dependencies } = await getWorkflowRequestContext(request);
    const body = await parseFailurePayload(request);
    const workflow = await registerPersistedWorkflowFailure(
      dependencies,
      {
        workflowId: id,
        stepId: body.stepId,
        failure: {
          reason: body.reason,
        },
      },
    );

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
