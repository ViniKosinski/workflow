import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { ORGANIZATION_ROLES } from "@/modules/organizations/domain/membership";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

export async function GET(request: Request) {
  try {
    const { dependencies, organizationId } = await getWorkflowRequestContext(request);
    await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.membershipRead);
    const members = await new PrismaMembershipRepository().list(organizationId);
    return Response.json({
      users: members.map((membership) => ({ userId: membership.userId, name: membership.user?.name ?? membership.userId, role: membership.role })),
      roles: Object.values(ORGANIZATION_ROLES),
    });
  } catch (error) { return workflowErrorResponse(error); }
}
