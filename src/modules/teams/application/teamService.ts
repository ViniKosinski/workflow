import { Prisma } from "@prisma/client";
import { ORGANIZATION_PERMISSIONS, OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { TeamError, parseTeamMemberRole, parseTeamName, type Team } from "@/modules/teams/domain/team";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

const include = { memberships: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" as const } } };
type TeamRecord = Prisma.TeamGetPayload<{ include: typeof include }>;
const mapTeam = (record: TeamRecord): Team => ({ id: record.id, organizationId: record.organizationId, name: record.name, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), members: record.memberships.map((membership) => ({ userId: membership.userId, role: membership.role.toLowerCase() as "manager" | "member", name: membership.user.name, email: membership.user.email })) });

async function authorize(actorUserId: string, organizationId: string, manage = false) {
  const membership = await new PrismaMembershipRepository().find(organizationId, actorUserId);
  if (!membership) throw new TeamError("Equipe não encontrada.", 404);
  new OrganizationAuthorizationService().require(membership.role, manage ? ORGANIZATION_PERMISSIONS.teamManage : ORGANIZATION_PERMISSIONS.teamRead);
}

async function requireTeam(organizationId: string, teamId: string) {
  const team = await prismaClient.team.findFirst({ where: { id: teamId, organizationId }, include });
  if (!team) throw new TeamError("Equipe não encontrada.", 404);
  return team;
}

export const teamService = {
  async list(actorUserId: string, organizationId: string) {
    await authorize(actorUserId, organizationId);
    return (await prismaClient.team.findMany({ where: { organizationId }, include, orderBy: { name: "asc" } })).map(mapTeam);
  },
  async create(actorUserId: string, organizationId: string, nameValue: unknown) {
    await authorize(actorUserId, organizationId, true);
    try { return mapTeam(await prismaClient.team.create({ data: { id: crypto.randomUUID(), organizationId, name: parseTeamName(nameValue) }, include })); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new TeamError("Já existe uma equipe com esse nome.", 409); throw error; }
  },
  async remove(actorUserId: string, organizationId: string, teamId: string) {
    await authorize(actorUserId, organizationId, true); await requireTeam(organizationId, teamId);
    await prismaClient.team.delete({ where: { id: teamId } });
  },
  async addMember(actorUserId: string, organizationId: string, teamId: string, userId: unknown, roleValue: unknown) {
    await authorize(actorUserId, organizationId, true); await requireTeam(organizationId, teamId);
    if (typeof userId !== "string" || !userId) throw new TeamError("Selecione um membro da organização.");
    if (!await new PrismaMembershipRepository().find(organizationId, userId)) throw new TeamError("O usuário precisa pertencer à organização.");
    try { await prismaClient.teamMembership.create({ data: { teamId, userId, role: parseTeamMemberRole(roleValue).toUpperCase() as "MANAGER" | "MEMBER" } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new TeamError("O usuário já pertence a esta equipe.", 409); throw error; }
    return mapTeam(await requireTeam(organizationId, teamId));
  },
  async changeMemberRole(actorUserId: string, organizationId: string, teamId: string, userId: string, roleValue: unknown) {
    await authorize(actorUserId, organizationId, true); await requireTeam(organizationId, teamId);
    try { await prismaClient.teamMembership.update({ where: { teamId_userId: { teamId, userId } }, data: { role: parseTeamMemberRole(roleValue).toUpperCase() as "MANAGER" | "MEMBER" } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new TeamError("Membro da equipe não encontrado.", 404); throw error; }
  },
  async removeMember(actorUserId: string, organizationId: string, teamId: string, userId: string) {
    await authorize(actorUserId, organizationId, true); await requireTeam(organizationId, teamId);
    try { await prismaClient.teamMembership.delete({ where: { teamId_userId: { teamId, userId } } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new TeamError("Membro da equipe não encontrado.", 404); throw error; }
  },
};
