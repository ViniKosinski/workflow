ALTER TABLE "workflow_definition_steps"
ADD CONSTRAINT "workflow_definition_steps_assignee_check"
CHECK (
  ("assignee_type" = 'user' AND "assignee_user_id" IS NOT NULL AND "assignee_role" IS NULL)
  OR
  ("assignee_type" = 'role' AND "assignee_user_id" IS NULL AND "assignee_role" IS NOT NULL)
);

ALTER TABLE "workflow_run_steps"
ADD CONSTRAINT "workflow_run_steps_assignee_check"
CHECK (
  ("assignee_type" = 'user' AND "assignee_user_id" IS NOT NULL AND "assignee_role" IS NULL)
  OR
  ("assignee_type" = 'role' AND "assignee_user_id" IS NULL AND "assignee_role" IS NOT NULL)
);
