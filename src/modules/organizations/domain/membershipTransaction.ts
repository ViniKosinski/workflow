import type { MembershipRepository } from "@/modules/organizations/domain/membershipRepository";

export type MembershipTransactionManager = Readonly<{
  run: <T>(work: (memberships: MembershipRepository) => Promise<T>) => Promise<T>;
}>;

export class MembershipConcurrencyError extends Error {
  constructor() {
    super("A composição da organização foi alterada por outra operação. Tente novamente.");
    this.name = "MembershipConcurrencyError";
  }
}
