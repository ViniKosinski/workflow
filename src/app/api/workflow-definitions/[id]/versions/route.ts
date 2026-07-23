import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import {
  createWorkflowDefinitionRevision,
  listWorkflowDefinitionRevisions,
} from "@/modules/workflowDefinitions/application/workflowDefinitionUseCases";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return Response.json({ definitions: await listWorkflowDefinitionRevisions((await getWorkflowDefinitionContext(request)).dependencies, id) });
  } catch (error) { return workflowErrorResponse(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const { dependencies, user } = await getWorkflowDefinitionContext(request);
    return Response.json({ definition: await createWorkflowDefinitionRevision(dependencies, id, user.userId) }, { status: 201 });
  } catch (error) { return workflowErrorResponse(error); }
}
