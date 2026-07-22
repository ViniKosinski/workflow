export class OrganizationNotFoundError extends Error {
  constructor() {
    super("Organização não encontrada.");
    this.name = "OrganizationNotFoundError";
  }
}

export class MembershipNotFoundError extends Error {
  constructor() {
    super("Membro não encontrado.");
    this.name = "MembershipNotFoundError";
  }
}

export class MembershipAlreadyExistsError extends Error {
  constructor() {
    super("O usuário já pertence à organização.");
    this.name = "MembershipAlreadyExistsError";
  }
}

export class InvitedUserNotFoundError extends Error {
  constructor() {
    super("Não foi possível adicionar o usuário informado.");
    this.name = "InvitedUserNotFoundError";
  }
}
