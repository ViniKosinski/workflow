import { getOrganizationRequestContext } from "@/app/api/organizations/_organizationRequest";
import { organizationErrorResponse, organizationJsonResponse } from "@/modules/organizations/presentation/api/organizationApiResponses";
import { teamService } from "@/modules/teams/application/teamService";
import { TeamError } from "@/modules/teams/domain/team";
type Context = { params: Promise<{ organizationId: string; teamId: string }> };
export async function POST(request: Request, { params }: Context) { try { const { organizationId, teamId } = await params; const { user } = await getOrganizationRequestContext(request); const body = await request.json(); return organizationJsonResponse({ team: await teamService.addMember(user.userId, organizationId, teamId, body.userId, body.role) }, { status: 201 }); } catch (error) { return error instanceof TeamError ? organizationJsonResponse({ message: error.message }, { status: error.status }) : organizationErrorResponse(error); } }
