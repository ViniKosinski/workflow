import { reorderWorkflowSteps } from "@/modules/workflows/application/reorderWorkflowSteps";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { workflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";

type ReorderWorkflowStepsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ReorderWorkflowStepsPayload = {
  orderedStepIds?: string[];
};

export async function PATCH(
  request: Request,
  context: ReorderWorkflowStepsRouteContext,
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as ReorderWorkflowStepsPayload;
    const workflow = await reorderWorkflowSteps(workflowPersistenceDependencies, {
      workflowId: id,
      orderedStepIds: payload.orderedStepIds ?? [],
    });

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
