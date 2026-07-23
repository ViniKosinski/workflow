import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import {
  archiveWorkflowDefinition,
  getWorkflowDefinition,
  updateWorkflowDefinition,
} from "@/modules/workflowDefinitions/application/workflowDefinitionUseCases";
import { parseWorkflowDefinitionPayload } from "@/modules/workflowDefinitions/presentation/api/workflowDefinitionPayload";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return Response.json({ definition: await getWorkflowDefinition((await getWorkflowDefinitionContext(request)).dependencies, id) });
  } catch (error) { return workflowErrorResponse(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return Response.json({ definition: await updateWorkflowDefinition(
      (await getWorkflowDefinitionContext(request)).dependencies,
      id,
      await parseWorkflowDefinitionPayload(request),
    ) });
  } catch (error) { return workflowErrorResponse(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await archiveWorkflowDefinition((await getWorkflowDefinitionContext(request)).dependencies, id);
    return new Response(null, { status: 204 });
  } catch (error) { return workflowErrorResponse(error); }
}
