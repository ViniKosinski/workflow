import { Prisma, PrismaClient } from "@prisma/client";
import type { RateLimiter } from "@/modules/auth/domain/authServices";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

type RateLimitResult = Readonly<{ attempt_count: number }>;

export class PrismaRateLimiter implements RateLimiter {
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async consume({ key, limit, windowMs, now }: Parameters<RateLimiter["consume"]>[0]) {
    const expiresAt = new Date(now.getTime() + windowMs);
    const rows = await this.prisma.$queryRaw<RateLimitResult[]>(Prisma.sql`
      INSERT INTO "auth_rate_limit_buckets" ("key", "attempt_count", "window_expires_at", "updated_at")
      VALUES (${key}, 1, ${expiresAt}, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "attempt_count" = CASE
          WHEN "auth_rate_limit_buckets"."window_expires_at" <= ${now} THEN 1
          ELSE "auth_rate_limit_buckets"."attempt_count" + 1
        END,
        "window_expires_at" = CASE
          WHEN "auth_rate_limit_buckets"."window_expires_at" <= ${now} THEN ${expiresAt}
          ELSE "auth_rate_limit_buckets"."window_expires_at"
        END,
        "updated_at" = ${now}
      RETURNING "attempt_count"
    `);
    return (rows[0]?.attempt_count ?? limit + 1) <= limit;
  }

  async deleteExpired(now: Date) {
    await this.prisma.authRateLimitBucket.deleteMany({ where: { windowExpiresAt: { lt: now } } });
  }
}
