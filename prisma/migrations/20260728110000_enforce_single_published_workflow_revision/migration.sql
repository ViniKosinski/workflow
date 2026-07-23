WITH ranked_published AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "organization_id", "definition_key"
           ORDER BY "revision_number" DESC, "updated_at" DESC, "id" DESC
         ) AS position
  FROM "workflow_definitions"
  WHERE "status" = 'published'
)
UPDATE "workflow_definitions" AS definition
SET "status" = 'archived',
    "archived_at" = COALESCE(definition."archived_at", CURRENT_TIMESTAMP),
    "updated_at" = CURRENT_TIMESTAMP,
    "version" = definition."version" + 1
FROM ranked_published
WHERE definition."id" = ranked_published."id"
  AND ranked_published.position > 1;

CREATE UNIQUE INDEX "workflow_definitions_single_published_revision"
ON "workflow_definitions" ("organization_id", "definition_key")
WHERE "status" = 'published';
