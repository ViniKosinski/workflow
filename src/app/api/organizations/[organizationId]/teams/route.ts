import { getOrganizationRequestContext } from "@/app/api/organizations/_organizationRequest";
import { organizationErrorResponse, organizationJsonResponse } from "@/modules/organizations/presentation/api/organizationApiResponses";
import { teamService } from "@/modules/teams/application/teamService";
import { TeamError } from "@/modules/teams/domain/team";

type Context = { params: Promise<{ organizationId: string }> };
const errorResponse = (error: unknown) => error instanceof TeamError ? organizationJsonResponse({ message: error.message }, { status: error.status }) : organizationErrorResponse(error);
export async function GET(_request: Request, { params }: Context) { try { const { organizationId } = await params; const { user } = await getOrganizationRequestContext(); return organizationJsonResponse({ teams: await teamService.list(user.userId, organizationId) }); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request, { params }: Context) { try { const { organizationId } = await params; const { user } = await getOrganizationRequestContext(request); const body = await request.json(); return organizationJsonResponse({ team: await teamService.create(user.userId, organizationId, body.name) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
