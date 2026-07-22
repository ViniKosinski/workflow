import { Prisma, type PrismaClient } from "@prisma/client";
import type { MembershipTransactionManager } from "@/modules/organizations/domain/membershipTransaction";
import type { MembershipRepository } from "@/modules/organizations/domain/membershipRepository";
import { MembershipConcurrencyError } from "@/modules/organizations/domain/membershipTransaction";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

export class PrismaMembershipTransactionManager implements MembershipTransactionManager {
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async run<T>(work: (memberships: MembershipRepository) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(
        (transaction) => work(new PrismaMembershipRepository(transaction)),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2025")) {
        throw new MembershipConcurrencyError();
      }
      throw error;
    }
  }
}
