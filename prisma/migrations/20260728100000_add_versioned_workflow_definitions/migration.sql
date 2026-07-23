CREATE TYPE "workflow_definition_status" AS ENUM ('draft', 'published', 'archived');

ALTER TABLE "workflow_definitions"
  ADD COLUMN "definition_key" VARCHAR(64),
  ADD COLUMN "revision_number" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "status" "workflow_definition_status" NOT NULL DEFAULT 'draft',
  ADD COLUMN "published_at" TIMESTAMPTZ(6),
  ADD COLUMN "published_by_user_id" VARCHAR(64);

UPDATE "workflow_definitions" definition
SET
  "definition_key" = definition."id",
  "status" = CASE WHEN run."status" = 'draft' THEN 'draft'::"workflow_definition_status" ELSE 'published'::"workflow_definition_status" END,
  "published_at" = CASE WHEN run."status" = 'draft' THEN NULL ELSE COALESCE(run."started_at", definition."updated_at") END,
  "published_by_user_id" = CASE WHEN run."status" = 'draft' THEN NULL ELSE definition."created_by_user_id" END
FROM "workflow_runs" run
WHERE run."workflow_definition_id" = definition."id";

UPDATE "workflow_definitions"
SET "definition_key" = "id"
WHERE "definition_key" IS NULL;

ALTER TABLE "workflow_definitions"
  ALTER COLUMN "definition_key" SET NOT NULL,
  ALTER COLUMN "definition_key" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "workflow_definitions"
  ADD CONSTRAINT "workflow_definitions_published_by_user_id_fkey"
  FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "workflow_definitions_organization_id_definition_key_revision_key"
  ON "workflow_definitions"("organization_id", "definition_key", "revision_number");
CREATE INDEX "workflow_definitions_organization_id_status_updated_at_idx"
  ON "workflow_definitions"("organization_id", "status", "updated_at");

ALTER TABLE "workflow_runs"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "started_by_user_id" VARCHAR(64);

UPDATE "workflow_runs" run
SET
  "version" = definition."version",
  "started_by_user_id" = definition."created_by_user_id"
FROM "workflow_definitions" definition
WHERE definition."id" = run."workflow_definition_id";

ALTER TABLE "workflow_runs"
  ADD CONSTRAINT "workflow_runs_started_by_user_id_fkey"
  FOREIGN KEY ("started_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "workflow_runs_workflow_definition_id_status_created_at_idx"
  ON "workflow_runs"("workflow_definition_id", "status", "created_at");
CREATE INDEX "workflow_runs_started_by_user_id_idx"
  ON "workflow_runs"("started_by_user_id");
