export type TeamMemberRole = "manager" | "member";

export type TeamMember = Readonly<{
  userId: string;
  role: TeamMemberRole;
  name: string;
  email: string;
}>;

export type Team = Readonly<{
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  members: ReadonlyArray<TeamMember>;
}>;

export class TeamError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "TeamError";
  }
}

export function parseTeamName(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 160) throw new TeamError("Informe um nome de equipe com até 160 caracteres.");
  return value.trim();
}

export function parseTeamMemberRole(value: unknown): TeamMemberRole {
  if (value !== "manager" && value !== "member") throw new TeamError("Papel de equipe inválido.");
  return value;
}
