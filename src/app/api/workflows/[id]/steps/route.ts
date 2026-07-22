import { addWorkflowStep } from "@/modules/workflows/application/addWorkflowStep";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";
import { parseStepNamePayload } from "@/modules/workflows/presentation/api/workflowRequestPayloads";

type WorkflowStepsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: WorkflowStepsRouteContext,
) {
  try {
    const { id } = await context.params;
    const { dependencies } = await getWorkflowRequestContext(request);
    const payload = await parseStepNamePayload(request);
    const workflow = await addWorkflowStep(dependencies, {
      workflowId: id,
      name: payload.name,
    });

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
