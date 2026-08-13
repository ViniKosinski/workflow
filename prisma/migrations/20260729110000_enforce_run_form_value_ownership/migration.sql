ALTER TABLE "workflow_run_form_values"
  DROP CONSTRAINT "workflow_run_form_values_field_fkey";

ALTER TABLE "workflow_run_form_fields"
  ADD CONSTRAINT "workflow_run_form_fields_run_id_id_key"
  UNIQUE ("workflow_run_id", "id");

ALTER TABLE "workflow_run_form_values"
  ADD CONSTRAINT "workflow_run_form_values_run_field_fkey"
  FOREIGN KEY ("workflow_run_id", "field_id")
  REFERENCES "workflow_run_form_fields" ("workflow_run_id", "id")
  ON DELETE CASCADE;
