CREATE TYPE "workflow_form_field_type" AS ENUM ('text','textarea','number','currency','boolean','date','datetime','select','multiselect');

CREATE TABLE "workflow_definition_form_fields" (
  "id" VARCHAR(64) PRIMARY KEY, "workflow_definition_id" VARCHAR(64) NOT NULL,
  "key" VARCHAR(120) NOT NULL, "label" VARCHAR(255) NOT NULL, "description" TEXT,
  "type" "workflow_form_field_type" NOT NULL, "required" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL, "default_value" JSONB,
  CONSTRAINT "workflow_definition_form_fields_definition_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "workflow_definition_form_fields_key_key" ON "workflow_definition_form_fields"("workflow_definition_id","key");
CREATE UNIQUE INDEX "workflow_definition_form_fields_order_key" ON "workflow_definition_form_fields"("workflow_definition_id","order");
CREATE INDEX "workflow_definition_form_fields_definition_idx" ON "workflow_definition_form_fields"("workflow_definition_id");

CREATE TABLE "workflow_definition_form_options" (
  "id" VARCHAR(64) PRIMARY KEY, "field_id" VARCHAR(64) NOT NULL, "value" VARCHAR(160) NOT NULL,
  "label" VARCHAR(255) NOT NULL, "order" INTEGER NOT NULL,
  CONSTRAINT "workflow_definition_form_options_field_fkey" FOREIGN KEY ("field_id") REFERENCES "workflow_definition_form_fields"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "workflow_definition_form_options_value_key" ON "workflow_definition_form_options"("field_id","value");
CREATE UNIQUE INDEX "workflow_definition_form_options_order_key" ON "workflow_definition_form_options"("field_id","order");

CREATE TABLE "workflow_run_form_fields" (
  "id" VARCHAR(64) PRIMARY KEY, "workflow_run_id" VARCHAR(64) NOT NULL, "source_field_id" VARCHAR(64),
  "key" VARCHAR(120) NOT NULL, "label" VARCHAR(255) NOT NULL, "description" TEXT,
  "type" "workflow_form_field_type" NOT NULL, "required" BOOLEAN NOT NULL, "order" INTEGER NOT NULL,
  "default_value" JSONB,
  CONSTRAINT "workflow_run_form_fields_run_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE,
  CONSTRAINT "workflow_run_form_fields_source_fkey" FOREIGN KEY ("source_field_id") REFERENCES "workflow_definition_form_fields"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "workflow_run_form_fields_key_key" ON "workflow_run_form_fields"("workflow_run_id","key");
CREATE UNIQUE INDEX "workflow_run_form_fields_order_key" ON "workflow_run_form_fields"("workflow_run_id","order");

CREATE TABLE "workflow_run_form_options" (
  "id" VARCHAR(64) PRIMARY KEY, "field_id" VARCHAR(64) NOT NULL, "value" VARCHAR(160) NOT NULL,
  "label" VARCHAR(255) NOT NULL, "order" INTEGER NOT NULL,
  CONSTRAINT "workflow_run_form_options_field_fkey" FOREIGN KEY ("field_id") REFERENCES "workflow_run_form_fields"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "workflow_run_form_options_value_key" ON "workflow_run_form_options"("field_id","value");
CREATE UNIQUE INDEX "workflow_run_form_options_order_key" ON "workflow_run_form_options"("field_id","order");

CREATE TABLE "workflow_run_form_values" (
  "workflow_run_id" VARCHAR(64) NOT NULL, "field_id" VARCHAR(64) NOT NULL, "value" JSONB,
  "updated_by_user_id" VARCHAR(64) NOT NULL, "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("workflow_run_id","field_id"),
  CONSTRAINT "workflow_run_form_values_run_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE,
  CONSTRAINT "workflow_run_form_values_field_fkey" FOREIGN KEY ("field_id") REFERENCES "workflow_run_form_fields"("id") ON DELETE CASCADE,
  CONSTRAINT "workflow_run_form_values_updated_by_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "workflow_run_form_values_field_key" ON "workflow_run_form_values"("field_id");
CREATE INDEX "workflow_run_form_values_run_idx" ON "workflow_run_form_values"("workflow_run_id");
