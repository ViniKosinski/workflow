CREATE TYPE "organization_role" AS ENUM ('owner', 'admin', 'editor', 'viewer');

CREATE TABLE "organizations" (
    "id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_memberships" (
    "organization_id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "role" "organization_role" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("organization_id", "user_id")
);

INSERT INTO "organizations" ("id", "name", "created_at", "updated_at")
SELECT "id", LEFT("name" || ' - Espaço pessoal', 160), "created_at", "updated_at"
FROM "users";

INSERT INTO "organization_memberships" ("organization_id", "user_id", "role", "created_at", "updated_at")
SELECT "id", "id", 'owner'::"organization_role", "created_at", "updated_at"
FROM "users";

ALTER TABLE "workflow_definitions" RENAME COLUMN "owner_user_id" TO "created_by_user_id";
ALTER TABLE "workflow_definitions" ADD COLUMN "organization_id" VARCHAR(64);
UPDATE "workflow_definitions" SET "organization_id" = "created_by_user_id";
ALTER TABLE "workflow_definitions" ALTER COLUMN "organization_id" SET NOT NULL;

DROP INDEX "workflow_definitions_owner_user_id_created_at_idx";
ALTER TABLE "workflow_definitions" RENAME CONSTRAINT "workflow_definitions_owner_user_id_fkey" TO "workflow_definitions_created_by_user_id_fkey";

CREATE INDEX "organization_memberships_user_id_organization_id_idx" ON "organization_memberships"("user_id", "organization_id");
CREATE INDEX "organization_memberships_organization_id_role_idx" ON "organization_memberships"("organization_id", "role");
CREATE INDEX "workflow_definitions_organization_id_created_at_idx" ON "workflow_definitions"("organization_id", "created_at");
CREATE INDEX "workflow_definitions_created_by_user_id_idx" ON "workflow_definitions"("created_by_user_id");

ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
