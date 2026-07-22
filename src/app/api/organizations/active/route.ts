import { cookies } from "next/headers";
import { getOrganizationRequestContext } from "@/app/api/organizations/_organizationRequest";
import { getOrganization } from "@/modules/organizations/application/getOrganization";
import { organizationErrorResponse } from "@/modules/organizations/presentation/api/organizationApiResponses";
import { ACTIVE_ORGANIZATION_COOKIE, getActiveOrganizationId } from "@/modules/organizations/presentation/server/activeOrganization";
import { parseJsonObject, requireString } from "@/shared/presentation/api/httpRequest";

export async function GET() {
  try {
    const { user } = await getOrganizationRequestContext();
    return Response.json({ organizationId: await getActiveOrganizationId(user.userId) });
  } catch (error) { return organizationErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const { user, dependencies } = await getOrganizationRequestContext(request);
    const organizationId = requireString(await parseJsonObject(request), "organizationId", 64);
    await getOrganization(dependencies, organizationId, user.userId);
    (await cookies()).set(ACTIVE_ORGANIZATION_COOKIE, organizationId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return new Response(null, { status: 204 });
  } catch (error) { return organizationErrorResponse(error); }
}
