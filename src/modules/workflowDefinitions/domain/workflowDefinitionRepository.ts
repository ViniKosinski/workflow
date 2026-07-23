import type { WorkflowDefinition, WorkflowDefinitionStatus } from "@/modules/workflowDefinitions/domain/workflowDefinition";

export type WorkflowDefinitionRepository = Readonly<{
  create: (definition: WorkflowDefinition) => Promise<WorkflowDefinition>;
  update: (definition: WorkflowDefinition) => Promise<WorkflowDefinition>;
  publish: (definition: WorkflowDefinition) => Promise<WorkflowDefinition>;
  archive: (definition: WorkflowDefinition) => Promise<WorkflowDefinition>;
  createRevision: (
    source: WorkflowDefinition,
    revision: WorkflowDefinition,
  ) => Promise<WorkflowDefinition>;
  findById: (id: string) => Promise<WorkflowDefinition | null>;
  list: (input?: Readonly<{ status?: WorkflowDefinitionStatus; limit?: number; offset?: number }>) => Promise<ReadonlyArray<WorkflowDefinition>>;
  listRevisions: (definitionKey: string) => Promise<ReadonlyArray<WorkflowDefinition>>;
}>;

export class WorkflowDefinitionNotFoundError extends Error {
  constructor() {
    super("Definição de workflow não encontrada.");
    this.name = "WorkflowDefinitionNotFoundError";
  }
}

export class WorkflowDefinitionConcurrencyError extends Error {
  constructor() {
    super("A definição foi alterada por outra operação.");
    this.name = "WorkflowDefinitionConcurrencyError";
  }
}
