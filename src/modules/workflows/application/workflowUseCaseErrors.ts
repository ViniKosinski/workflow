export class WorkflowNotFoundError extends Error {
  constructor(workflowId: string) {
    super(`Workflow ${workflowId} was not found.`);
    this.name = "WorkflowNotFoundError";
  }
}

export class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowValidationError";
  }
}

export class WorkflowBusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowBusinessError";
  }
}
