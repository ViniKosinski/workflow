CREATE TABLE "workflow_definition_transitions" (
  "id" VARCHAR(64) NOT NULL,
  "source_step_id" VARCHAR(64) NOT NULL,
  "target_step_id" VARCHAR(64),
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "result" VARCHAR(120) NOT NULL,
  "ends_workflow" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "workflow_definition_transitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workflow_definition_transitions_destination_check" CHECK (("ends_workflow" AND "target_step_id" IS NULL) OR (NOT "ends_workflow" AND "target_step_id" IS NOT NULL))
);
CREATE UNIQUE INDEX "workflow_definition_transitions_source_step_id_result_key" ON "workflow_definition_transitions"("source_step_id", "result");
CREATE INDEX "workflow_definition_transitions_source_step_id_idx" ON "workflow_definition_transitions"("source_step_id");
CREATE INDEX "workflow_definition_transitions_target_step_id_idx" ON "workflow_definition_transitions"("target_step_id");
ALTER TABLE "workflow_definition_transitions" ADD CONSTRAINT "workflow_definition_transitions_source_step_id_fkey" FOREIGN KEY ("source_step_id") REFERENCES "workflow_definition_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_definition_transitions" ADD CONSTRAINT "workflow_definition_transitions_target_step_id_fkey" FOREIGN KEY ("target_step_id") REFERENCES "workflow_definition_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "workflow_definition_transitions" ("id", "source_step_id", "target_step_id", "name", "result", "ends_workflow", "updated_at")
SELECT 'legacy-' || md5(step."id"), step."id", next_step."id", 'Concluir', 'completed', next_step."id" IS NULL, CURRENT_TIMESTAMP
FROM "workflow_definition_steps" step
LEFT JOIN "workflow_definition_steps" next_step
  ON next_step."workflow_definition_id" = step."workflow_definition_id"
 AND next_step."order" = step."order" + 1;
