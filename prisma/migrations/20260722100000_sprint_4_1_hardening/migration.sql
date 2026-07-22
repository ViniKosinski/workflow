CREATE TABLE "auth_rate_limit_buckets" (
    "key" VARCHAR(64) NOT NULL,
    "attempt_count" INTEGER NOT NULL,
    "window_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "auth_rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "auth_rate_limit_buckets_window_expires_at_idx" ON "auth_rate_limit_buckets"("window_expires_at");
CREATE INDEX "workflow_runs_workflow_definition_id_created_at_idx" ON "workflow_runs"("workflow_definition_id", "created_at");
