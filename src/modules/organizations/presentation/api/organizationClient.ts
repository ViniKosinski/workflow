import type { ApiError, OrganizationAuthorizationView, OrganizationMemberView, OrganizationRole, OrganizationView } from "@/modules/organizations/presentation/types/organizationViewModels";
import type { Team, TeamMemberRole } from "@/modules/teams/domain/team";

async function requestJson<T extends object>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({})) as T | ApiError;
  if (!response.ok) throw new Error("message" in payload && payload.message ? payload.message : "Não foi possível concluir a operação.");
  return payload as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const organizationClient = {
  async list() { return (await requestJson<{ organizations: OrganizationView[] }>("/api/organizations")).organizations; },
  async get(id: string) { return (await requestJson<{ organization: OrganizationView }>(`/api/organizations/${id}`)).organization; },
  async create(name: string) { return (await requestJson<{ organization: OrganizationView }>("/api/organizations", json("POST", { name }))).organization; },
  async members(id: string) { return (await requestJson<{ members: OrganizationMemberView[] }>(`/api/organizations/${id}/members`)).members; },
  async authorization(id: string) { return (await requestJson<{ authorization: OrganizationAuthorizationView }>(`/api/organizations/${id}/permissions`)).authorization; },
  async roles() { return (await requestJson<{ roles: Exclude<OrganizationRole, "owner">[] }>("/api/organizations/roles")).roles; },
  async addMember(id: string, email: string, role: OrganizationRole) { await requestJson(`/api/organizations/${id}/members`, json("POST", { email, role })); },
  async changeRole(id: string, userId: string, role: OrganizationRole) { await requestJson(`/api/organizations/${id}/members/${userId}`, json("PATCH", { role })); },
  async removeMember(id: string, userId: string) { await requestJson(`/api/organizations/${id}/members/${userId}`, { method: "DELETE" }); },
  async teams(id: string) { return (await requestJson<{ teams: Team[] }>(`/api/organizations/${id}/teams`)).teams; },
  async createTeam(id: string, name: string) { return (await requestJson<{ team: Team }>(`/api/organizations/${id}/teams`, json("POST", { name }))).team; },
  async removeTeam(id: string, teamId: string) { await requestJson(`/api/organizations/${id}/teams/${teamId}`, { method: "DELETE" }); },
  async addTeamMember(id: string, teamId: string, userId: string, role: TeamMemberRole) { await requestJson(`/api/organizations/${id}/teams/${teamId}/members`, json("POST", { userId, role })); },
  async changeTeamMemberRole(id: string, teamId: string, userId: string, role: TeamMemberRole) { await requestJson(`/api/organizations/${id}/teams/${teamId}/members/${userId}`, json("PATCH", { role })); },
  async removeTeamMember(id: string, teamId: string, userId: string) { await requestJson(`/api/organizations/${id}/teams/${teamId}/members/${userId}`, { method: "DELETE" }); },
};
