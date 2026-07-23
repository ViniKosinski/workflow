import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import { addWorkflowTransition } from "@/modules/workflows/application/manageWorkflowTransitions";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";
import { HttpRequestError } from "@/shared/presentation/api/httpRequest";
import { parseTransitionPayload } from "@/modules/workflows/presentation/api/workflowTransitionPayload";

type Context = { params: Promise<{ id: string; stepId: string }> };
export async function GET(request: Request, context: Context) {
  try { const { id, stepId } = await context.params; const { dependencies } = await getWorkflowRequestContext(request); const workflow = await getPersistedWorkflowById(dependencies, id); const step = workflow.steps.find((item) => item.id === stepId); if (!step) throw new HttpRequestError(400, "Etapa inválida."); return Response.json({ transitions: step.transitions }); } catch (error) { return workflowErrorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try { const { id, stepId } = await context.params; const { dependencies } = await getWorkflowRequestContext(request); return Response.json({ workflow: await addWorkflowTransition(dependencies, id, stepId, await parseTransitionPayload(request)) }, { status: 201 }); } catch (error) { return workflowErrorResponse(error); }
}
