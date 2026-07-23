import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";
import { removeWorkflowTransition, updateWorkflowTransition } from "@/modules/workflows/application/manageWorkflowTransitions";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";
import { parseTransitionPayload } from "@/modules/workflows/presentation/api/workflowTransitionPayload";
type Context = { params: Promise<{ id: string; stepId: string; transitionId: string }> };
export async function PATCH(request: Request, context: Context) { try { const { id, stepId, transitionId } = await context.params; const { dependencies } = await getWorkflowRequestContext(request); return Response.json({ workflow: await updateWorkflowTransition(dependencies, id, stepId, transitionId, await parseTransitionPayload(request)) }); } catch (error) { return workflowErrorResponse(error); } }
export async function DELETE(request: Request, context: Context) { try { const { id, stepId, transitionId } = await context.params; const { dependencies } = await getWorkflowRequestContext(request); await removeWorkflowTransition(dependencies, id, stepId, transitionId); return new Response(null, { status: 204 }); } catch (error) { return workflowErrorResponse(error); } }
