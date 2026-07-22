import { getOrganizationRequestContext } from "@/app/api/organizations/_organizationRequest";
import { checkOrganizationAuthorization } from "@/modules/organizations/application/checkOrganizationAuthorization";
import { organizationErrorResponse, organizationJsonResponse } from "@/modules/organizations/presentation/api/organizationApiResponses";
import { parsePermission } from "@/modules/organizations/presentation/api/organizationRequestPayloads";

export async function GET(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  try {
    const { organizationId } = await params;
    const { user, dependencies } = await getOrganizationRequestContext();
    const authorization = await checkOrganizationAuthorization(
      dependencies,
      user.userId,
      organizationId,
      parsePermission(new URL(request.url).searchParams.get("permission")),
    );
    return organizationJsonResponse({ authorization });
  } catch (error) { return organizationErrorResponse(error); }
}
