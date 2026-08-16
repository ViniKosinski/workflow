import { getOrganizationRequestContext } from "@/app/api/organizations/_organizationRequest";
import { organizationErrorResponse, organizationJsonResponse } from "@/modules/organizations/presentation/api/organizationApiResponses";
import { teamService } from "@/modules/teams/application/teamService";
import { TeamError } from "@/modules/teams/domain/team";
type Context = { params: Promise<{ organizationId: string; teamId: string; userId: string }> };
const errorResponse = (error: unknown) => error instanceof TeamError ? organizationJsonResponse({ message: error.message }, { status: error.status }) : organizationErrorResponse(error);
export async function PATCH(request: Request, { params }: Context) { try { const { organizationId, teamId, userId } = await params; const { user } = await getOrganizationRequestContext(request); const body = await request.json(); await teamService.changeMemberRole(user.userId, organizationId, teamId, userId, body.role); return organizationJsonResponse({ ok: true }); } catch (error) { return errorResponse(error); } }
export async function DELETE(request: Request, { params }: Context) { try { const { organizationId, teamId, userId } = await params; const { user } = await getOrganizationRequestContext(request); await teamService.removeMember(user.userId, organizationId, teamId, userId); return new Response(null, { status: 204 }); } catch (error) { return errorResponse(error); } }
