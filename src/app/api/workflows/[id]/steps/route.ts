import { addWorkflowStep } from "@/modules/workflows/application/addWorkflowStep";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { workflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";

type WorkflowStepsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AddWorkflowStepPayload = {
  name?: string;
};

export async function POST(
  request: Request,
  context: WorkflowStepsRouteContext,
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as AddWorkflowStepPayload;
    const workflow = await addWorkflowStep(workflowPersistenceDependencies, {
      workflowId: id,
      name: payload.name ?? "",
    });

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
