import { getOrganizationRequestContext } from "@/app/api/organizations/_organizationRequest";
import { changeOrganizationMemberRole } from "@/modules/organizations/application/changeOrganizationMemberRole";
import { removeOrganizationMember } from "@/modules/organizations/application/removeOrganizationMember";
import { organizationErrorResponse, organizationJsonResponse } from "@/modules/organizations/presentation/api/organizationApiResponses";
import { parseChangeRolePayload } from "@/modules/organizations/presentation/api/organizationRequestPayloads";

type Context = { params: Promise<{ organizationId: string; userId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { organizationId, userId } = await params;
    const context = await getOrganizationRequestContext(request);
    const membership = await changeOrganizationMemberRole(context.dependencies, context.user.userId, organizationId, userId, await parseChangeRolePayload(request));
    return organizationJsonResponse({ membership });
  } catch (error) { return organizationErrorResponse(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { organizationId, userId } = await params;
    const context = await getOrganizationRequestContext(request);
    await removeOrganizationMember(context.dependencies, context.user.userId, organizationId, userId);
    return new Response(null, { status: 204 });
  } catch (error) { return organizationErrorResponse(error); }
}
