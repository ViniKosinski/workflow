import { describe, expect, it } from "vitest";
import { parseTeamMemberRole, parseTeamName, TeamError } from "@/modules/teams/domain/team";

describe("team domain", () => {
  it("normaliza o nome e aceita os papéis da equipe", () => {
    expect(parseTeamName("  Financeiro  ")).toBe("Financeiro");
    expect(parseTeamMemberRole("manager")).toBe("manager");
    expect(parseTeamMemberRole("member")).toBe("member");
  });
  it("rejeita nome vazio e papel inválido", () => {
    expect(() => parseTeamName(" ")).toThrow(TeamError);
    expect(() => parseTeamMemberRole("owner")).toThrow(TeamError);
  });
});
