import { PrismaClient, UserStatus as PrismaUserStatus } from "@prisma/client";
import type { CreateSessionRecord, SessionRepository, SessionWithUser } from "@/modules/auth/domain/sessionRepository";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async create(record: CreateSessionRecord) {
    await this.prisma.authSession.create({
      data: {
        id: record.id,
        userId: record.userId,
        tokenHash: record.tokenHash,
        expiresAt: new Date(record.expiresAt),
        createdAt: new Date(record.now),
        lastSeenAt: new Date(record.now),
        userAgent: record.userAgent,
        ipAddress: record.ipAddress,
      },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<SessionWithUser | null> {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!session) return null;
    return {
      id: session.id,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString(),
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        status: session.user.status === PrismaUserStatus.ACTIVE ? "active" as const : "disabled" as const,
        createdAt: session.user.createdAt.toISOString(),
        updatedAt: session.user.updatedAt.toISOString(),
      },
    };
  }

  async touch(sessionId: string, now: string) {
    await this.prisma.authSession.update({ where: { id: sessionId }, data: { lastSeenAt: new Date(now) } });
  }

  async revokeByTokenHash(tokenHash: string, now: string) {
    await this.prisma.authSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date(now) },
    });
  }

  async revokeAllForUser(userId: string, now: string, exceptSessionId?: string) {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null, id: exceptSessionId ? { not: exceptSessionId } : undefined },
      data: { revokedAt: new Date(now) },
    });
  }

  async deleteExpired(now: string) {
    await this.prisma.authSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date(now) } },
          { revokedAt: { lt: new Date(now) } },
        ],
      },
    });
  }
}
