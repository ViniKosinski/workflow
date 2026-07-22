import { createOrganization } from "@/modules/organizations/application/createOrganization";
import { listOrganizations } from "@/modules/organizations/application/listOrganizations";
import { getOrganizationRequestContext } from "@/app/api/organizations/_organizationRequest";
import { organizationErrorResponse, organizationJsonResponse } from "@/modules/organizations/presentation/api/organizationApiResponses";
import { parseCreateOrganizationPayload } from "@/modules/organizations/presentation/api/organizationRequestPayloads";

export async function GET() {
  try {
    const { user, dependencies } = await getOrganizationRequestContext();
    return organizationJsonResponse({ organizations: await listOrganizations(dependencies, user.userId) });
  } catch (error) { return organizationErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const { user, dependencies } = await getOrganizationRequestContext(request);
    const organization = await createOrganization(dependencies, user.userId, await parseCreateOrganizationPayload(request));
    return organizationJsonResponse({ organization }, { status: 201 });
  } catch (error) { return organizationErrorResponse(error); }
}
