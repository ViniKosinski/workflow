ALTER TABLE "workflow_definition_steps"
  ADD COLUMN "sla_duration_hours" INTEGER;

ALTER TABLE "workflow_run_steps"
  ADD COLUMN "sla_duration_hours" INTEGER,
  ADD COLUMN "due_at" TIMESTAMPTZ(6);

ALTER TABLE "workflow_definition_steps"
  ADD CONSTRAINT "workflow_definition_steps_sla_duration_hours_check"
  CHECK ("sla_duration_hours" IS NULL OR "sla_duration_hours" BETWEEN 1 AND 8760);

ALTER TABLE "workflow_run_steps"
  ADD CONSTRAINT "workflow_run_steps_sla_duration_hours_check"
  CHECK ("sla_duration_hours" IS NULL OR "sla_duration_hours" BETWEEN 1 AND 8760);

CREATE INDEX "workflow_run_steps_status_due_at_idx"
  ON "workflow_run_steps"("status", "due_at");
