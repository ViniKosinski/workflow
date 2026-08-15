import { ORGANIZATION_PERMISSIONS, type OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";
import type { MembershipRepository } from "@/modules/organizations/domain/membershipRepository";
import type { OrganizationTaskListQuery } from "@/modules/tasks/domain/task";
import type { OrganizationTaskRepository } from "@/modules/tasks/domain/taskRepository";

type Dependencies = Readonly<{
  tasks: OrganizationTaskRepository;
  memberships: MembershipRepository;
  organizationAuthorization: OrganizationAuthorizationService;
}>;

async function authorize(dependencies: Dependencies, actorUserId: string, organizationId: string) {
  const membership = await dependencies.memberships.find(organizationId, actorUserId);
  if (!membership) throw new OrganizationNotFoundError();
  dependencies.organizationAuthorization.require(membership.role, ORGANIZATION_PERMISSIONS.taskOrganizationRead);
}

export async function listOrganizationTasks(dependencies: Dependencies, actorUserId: string, organizationId: string, query: OrganizationTaskListQuery) {
  await authorize(dependencies, actorUserId, organizationId);
  return dependencies.tasks.listOrganization(organizationId, query);
}

export async function getOrganizationTask(dependencies: Dependencies, actorUserId: string, organizationId: string, taskId: string) {
  await authorize(dependencies, actorUserId, organizationId);
  const task = await dependencies.tasks.findInOrganization(taskId, organizationId);
  if (!task) return null;
  return { task, history: await dependencies.tasks.listHistory(taskId) };
}
