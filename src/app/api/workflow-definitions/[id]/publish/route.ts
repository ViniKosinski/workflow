import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import { publishWorkflowDefinition } from "@/modules/workflowDefinitions/application/workflowDefinitionUseCases";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { dependencies, user } = await getWorkflowDefinitionContext(request);
    return Response.json({ definition: await publishWorkflowDefinition(dependencies, id, user.userId) });
  } catch (error) { return workflowErrorResponse(error); }
}
