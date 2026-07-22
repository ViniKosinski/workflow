import { getOrganization } from "@/modules/organizations/application/getOrganization";
import { getOrganizationRequestContext } from "@/app/api/organizations/_organizationRequest";
import { organizationErrorResponse, organizationJsonResponse } from "@/modules/organizations/presentation/api/organizationApiResponses";

export async function GET(_request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  try {
    const { organizationId } = await params;
    const { user, dependencies } = await getOrganizationRequestContext();
    return organizationJsonResponse({ organization: await getOrganization(dependencies, user.userId, organizationId) });
  } catch (error) { return organizationErrorResponse(error); }
}
