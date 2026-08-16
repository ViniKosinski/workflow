import { describe, expect, it } from "vitest";
import {
  WORKFLOW_DEFINITION_STATUSES,
  WorkflowDefinitionError,
  WorkflowDefinitionService,
} from "@/modules/workflowDefinitions/domain/workflowDefinition";

const service = new WorkflowDefinitionService();
const steps = [
  {
    id: "analysis",
    name: "Análise",
    order: 1,
    assignee: { type: "role" as const, role: "editor" as const },
    transitions: [{ id: "approve", name: "Aprovar", result: "approved", targetStepId: "finish", endsWorkflow: false }],
  },
  {
    id: "finish",
    name: "Finalização",
    order: 2,
    assignee: { type: "role" as const, role: "editor" as const },
    transitions: [{ id: "done", name: "Finalizar", result: "done", endsWorkflow: true }],
  },
];

function draft() {
  return service.create({ id: "definition", name: "Aprovação", steps, createdByUserId: "user", now: "2026-07-23T10:00:00.000Z" });
}

describe("WorkflowDefinitionService", () => {
  it("publica somente um grafo válido", () => {
    const published = service.publish(draft(), "publisher", "2026-07-23T11:00:00.000Z");
    expect(published).toMatchObject({
      status: WORKFLOW_DEFINITION_STATUSES.published,
      revisionNumber: 1,
      publishedByUserId: "publisher",
    });
  });

  it("torna a revisão publicada imutável", () => {
    const published = service.publish(draft(), "publisher", "2026-07-23T11:00:00.000Z");
    expect(() => service.updateDraft(published, { name: "Alterada", steps, now: "2026-07-23T12:00:00.000Z" }))
      .toThrow(WorkflowDefinitionError);
  });

  it("cria nova revisão remapeando etapas e transições sem alterar a publicada", () => {
    const published = service.publish(draft(), "publisher", "2026-07-23T11:00:00.000Z");
    const revision = service.createRevision(published, {
      id: "definition-v2",
      stepIds: ["analysis-v2", "finish-v2"],
      transitionIds: ["approve-v2", "done-v2"],
      formFieldIds: [],
      formOptionIds: [],
      actorUserId: "editor",
      now: "2026-07-23T12:00:00.000Z",
    });
    expect(revision).toMatchObject({ definitionKey: "definition", revisionNumber: 2, status: "draft" });
    expect(revision.steps[0].transitions[0].targetStepId).toBe("finish-v2");
    expect(published.steps[0].id).toBe("analysis");
  });

  it("recusa iniciar execução a partir de rascunho", () => {
    expect(() => service.requirePublished(draft())).toThrow(WorkflowDefinitionError);
  });

  it("aceita SLA opcional em horas inteiras", () => {
    const definition = service.create({ id: "sla", name: "Com prazo", steps: steps.map((step) => ({ ...step, slaDurationHours: 48 })), createdByUserId: "user", now: "2026-07-23T10:00:00.000Z" });
    expect(definition.steps[0].slaDurationHours).toBe(48);
  });

  it("rejeita SLA fora do intervalo permitido", () => {
    expect(() => service.create({ id: "sla", name: "Inválido", steps: [{ ...steps[0], slaDurationHours: 0 }], createdByUserId: "user", now: "2026-07-23T10:00:00.000Z" })).toThrow(WorkflowDefinitionError);
  });
});
