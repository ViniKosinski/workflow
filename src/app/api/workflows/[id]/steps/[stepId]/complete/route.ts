import { completePersistedWorkflowStep } from "@/modules/workflows/application/completePersistedWorkflowStep";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { workflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";

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
    const body = await request.json().catch(() => ({}));
    const workflow = await completePersistedWorkflowStep(
      workflowPersistenceDependencies,
      {
        workflowId: id,
        stepId,
        result: {
          message: String(body.message ?? "Etapa concluída."),
        },
      },
    );

    return workflowJsonResponse({ workflow });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
