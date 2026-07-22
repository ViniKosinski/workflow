import { startPersistedWorkflowStep } from "@/modules/workflows/application/startPersistedWorkflowStep";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";

type WorkflowStepRouteContext = {
  params: Promise<{
    id: string;
    stepId: string;
  }>;
};

export async function POST(
  _request: Request,
  context: WorkflowStepRouteContext,
) {
  try {
    const { id, stepId } = await context.params;
    const workflow = await startPersistedWorkflowStep(
      (await getWorkflowRequestContext(_request)).dependencies,
      {
        workflowId: id,
        stepId,
      },
    );

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
