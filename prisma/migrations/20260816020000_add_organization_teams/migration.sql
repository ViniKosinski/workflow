CREATE TYPE "team_member_role" AS ENUM ('manager', 'member');

CREATE TABLE "teams" (
  "id" VARCHAR(64) NOT NULL,
  "organization_id" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "team_memberships" (
  "team_id" VARCHAR(64) NOT NULL,
  "user_id" VARCHAR(64) NOT NULL,
  "role" "team_member_role" NOT NULL DEFAULT 'member',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("team_id", "user_id"),
  CONSTRAINT "team_memberships_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "team_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "teams_organization_id_name_key" ON "teams"("organization_id", "name");
CREATE INDEX "teams_organization_id_created_at_idx" ON "teams"("organization_id", "created_at");
CREATE INDEX "team_memberships_user_id_team_id_idx" ON "team_memberships"("user_id", "team_id");
