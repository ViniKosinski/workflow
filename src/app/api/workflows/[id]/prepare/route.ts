import { preparePersistedWorkflow } from "@/modules/workflows/application/preparePersistedWorkflow";
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

export async function POST(_request: Request, context: WorkflowRouteContext) {
  try {
    const { id } = await context.params;
    const workflow = await preparePersistedWorkflow(
      (await getWorkflowRequestContext(_request)).dependencies,
      id,
    );

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
