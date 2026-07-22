import { getOrganizationRequestContext } from "@/app/api/organizations/_organizationRequest";
import { inviteOrganizationMember } from "@/modules/organizations/application/inviteOrganizationMember";
import { listOrganizationMembers } from "@/modules/organizations/application/listOrganizationMembers";
import { organizationErrorResponse, organizationJsonResponse } from "@/modules/organizations/presentation/api/organizationApiResponses";
import { parseInviteMemberPayload } from "@/modules/organizations/presentation/api/organizationRequestPayloads";

type Context = { params: Promise<{ organizationId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { organizationId } = await params;
    const { user, dependencies } = await getOrganizationRequestContext();
    return organizationJsonResponse({ members: await listOrganizationMembers(dependencies, user.userId, organizationId) });
  } catch (error) { return organizationErrorResponse(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { organizationId } = await params;
    const { user, dependencies } = await getOrganizationRequestContext(request);
    const membership = await inviteOrganizationMember(dependencies, user.userId, organizationId, await parseInviteMemberPayload(request));
    return organizationJsonResponse({ membership }, { status: 201 });
  } catch (error) { return organizationErrorResponse(error); }
}
