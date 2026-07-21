import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { workflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";

type WorkflowRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: WorkflowRouteContext) {
  try {
    const { id } = await context.params;
    const workflow = await getPersistedWorkflowById(
      workflowPersistenceDependencies,
      id,
    );

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
