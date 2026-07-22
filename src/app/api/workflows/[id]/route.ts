import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";

type WorkflowRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: WorkflowRouteContext) {
  try {
    const { id } = await context.params;
    const workflow = await getPersistedWorkflowById(
      (await getWorkflowRequestContext()).dependencies,
      id,
    );

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
