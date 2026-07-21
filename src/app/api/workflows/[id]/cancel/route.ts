import { cancelPersistedWorkflow } from "@/modules/workflows/application/cancelPersistedWorkflow";
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

export async function POST(request: Request, context: WorkflowRouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const workflow = await cancelPersistedWorkflow(
      workflowPersistenceDependencies,
      {
        workflowId: id,
        reason: String(body.reason ?? ""),
      },
    );

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
