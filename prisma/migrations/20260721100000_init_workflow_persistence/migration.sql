-- CreateEnum
CREATE TYPE "workflow_status" AS ENUM ('draft', 'ready', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "workflow_step_status" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "workflow_event_scope" AS ENUM ('workflow', 'step');

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definition_steps" (
    "id" VARCHAR(64) NOT NULL,
    "workflow_definition_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workflow_definition_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" VARCHAR(64) NOT NULL,
    "workflow_definition_id" VARCHAR(64) NOT NULL,
    "status" "workflow_status" NOT NULL,
    "current_step_id" VARCHAR(64),
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_run_steps" (
    "id" VARCHAR(64) NOT NULL,
    "workflow_run_id" VARCHAR(64) NOT NULL,
    "workflow_definition_step_id" VARCHAR(64),
    "name" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "workflow_step_status" NOT NULL,
    "execution_result" JSONB,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workflow_run_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_execution_events" (
    "id" VARCHAR(64) NOT NULL,
    "workflow_run_id" VARCHAR(64) NOT NULL,
    "workflow_run_step_id" VARCHAR(64),
    "event_type" VARCHAR(80) NOT NULL,
    "event_scope" "workflow_event_scope" NOT NULL,
    "from_workflow_status" "workflow_status",
    "to_workflow_status" "workflow_status",
    "from_step_status" "workflow_step_status",
    "to_step_status" "workflow_step_status",
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "error" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_execution_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definition_steps_workflow_definition_id_order_key" ON "workflow_definition_steps"("workflow_definition_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_runs_current_step_id_key" ON "workflow_runs"("current_step_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_run_steps_workflow_run_id_order_key" ON "workflow_run_steps"("workflow_run_id", "order");

-- CreateIndex
CREATE INDEX "workflow_definition_steps_workflow_definition_id_idx" ON "workflow_definition_steps"("workflow_definition_id");

-- CreateIndex
CREATE INDEX "workflow_runs_workflow_definition_id_idx" ON "workflow_runs"("workflow_definition_id");

-- CreateIndex
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs"("status");

-- CreateIndex
CREATE INDEX "workflow_run_steps_workflow_run_id_idx" ON "workflow_run_steps"("workflow_run_id");

-- CreateIndex
CREATE INDEX "workflow_run_steps_workflow_definition_step_id_idx" ON "workflow_run_steps"("workflow_definition_step_id");

-- CreateIndex
CREATE INDEX "workflow_run_steps_status_idx" ON "workflow_run_steps"("status");

-- CreateIndex
CREATE INDEX "workflow_execution_events_workflow_run_id_occurred_at_idx" ON "workflow_execution_events"("workflow_run_id", "occurred_at");

-- CreateIndex
CREATE INDEX "workflow_execution_events_workflow_run_step_id_idx" ON "workflow_execution_events"("workflow_run_step_id");

-- CreateIndex
CREATE INDEX "workflow_execution_events_event_type_idx" ON "workflow_execution_events"("event_type");

-- CreateIndex
CREATE INDEX "workflow_execution_events_event_scope_idx" ON "workflow_execution_events"("event_scope");

-- AddForeignKey
ALTER TABLE "workflow_definition_steps" ADD CONSTRAINT "workflow_definition_steps_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_current_step_id_fkey" FOREIGN KEY ("current_step_id") REFERENCES "workflow_run_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run_steps" ADD CONSTRAINT "workflow_run_steps_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run_steps" ADD CONSTRAINT "workflow_run_steps_workflow_definition_step_id_fkey" FOREIGN KEY ("workflow_definition_step_id") REFERENCES "workflow_definition_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_execution_events" ADD CONSTRAINT "workflow_execution_events_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_execution_events" ADD CONSTRAINT "workflow_execution_events_workflow_run_step_id_fkey" FOREIGN KEY ("workflow_run_step_id") REFERENCES "workflow_run_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
