import { describe, expect, it } from "vitest";
import {
  ALLOWED_WORKFLOW_TRANSITIONS,
  PROHIBITED_WORKFLOW_TRANSITIONS,
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_STATUSES,
  WORKFLOW_STEP_EVENT_TYPES,
  WORKFLOW_STEP_STATUSES,
  isWorkflowTransitionAllowed,
  type Workflow,
  type WorkflowEngineDependencies,
  type WorkflowEngineService,
} from "@/modules/workflows/domain/workflowEngine";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";

function createTestDependencies(): WorkflowEngineDependencies {
  let workflowId = 0;
  let stepId = 0;
  let eventId = 0;
  let tick = 0;

  return {
    clock: {
      now: () => {
        tick += 1;
        return `2026-01-01T00:00:${String(tick).padStart(2, "0")}.000Z`;
      },
    },
    idGenerator: {
      createWorkflowId: () => {
        workflowId += 1;
        return `workflow-${workflowId}`;
      },
      createStepId: () => {
        stepId += 1;
        return `step-${stepId}`;
      },
      createEventId: () => {
        eventId += 1;
        return `event-${eventId}`;
      },
    },
  };
}

function createEngine() {
  return createWorkflowEngine(createTestDependencies());
}

function createValidWorkflow(engine: WorkflowEngineService) {
  const result = engine.createWorkflow({
    name: "Aprovação de compras",
    steps: [
      { name: "Solicitar compra", order: 1 },
      { name: "Aprovar compra", order: 2 },
    ],
  });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

function prepareWorkflow(engine: WorkflowEngineService, workflow: Workflow) {
  const result = engine.prepareWorkflow({ workflow });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

function startWorkflow(engine: WorkflowEngineService, workflow: Workflow) {
  const result = engine.startExecution({ workflow });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

function startCurrentStep(engine: WorkflowEngineService, workflow: Workflow) {
  if (!workflow.currentStepId) {
    throw new Error("Workflow sem etapa atual.");
  }

  const result = engine.startStep({
    workflow,
    stepId: workflow.currentStepId,
  });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

function completeCurrentStep(engine: WorkflowEngineService, workflow: Workflow) {
  if (!workflow.currentStepId) {
    throw new Error("Workflow sem etapa atual.");
  }

  const result = engine.completeStep({
    workflow,
    stepId: workflow.currentStepId,
    result: { message: "Etapa concluída com sucesso." },
  });

  expect(result.success).toBe(true);

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}

describe("WorkflowEngine", () => {
  describe("criação", () => {
    it("cria um fluxo válido em rascunho", () => {
      const engine = createEngine();
      const result = engine.createWorkflow({
        name: "Onboarding de cliente",
        steps: [{ name: "Criar conta", order: 1 }],
      });

      expect(result.success).toBe(true);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      expect(result.data.status).toBe(WORKFLOW_STATUSES.draft);
      expect(result.data.steps).toHaveLength(1);
      expect(result.data.steps[0].status).toBe(WORKFLOW_STEP_STATUSES.pending);
      expect(result.data.executionHistory[0].type).toBe(
        WORKFLOW_EVENT_TYPES.workflowCreated,
      );
    });

    it("impede fluxo sem etapas", () => {
      const engine = createEngine();
      const result = engine.createWorkflow({
        name: "Fluxo inválido",
        steps: [],
      });

      expect(result.success).toBe(false);

      if (result.success) {
        throw new Error("Fluxo inválido foi criado.");
      }

      expect(result.error.code).toBe("INVALID_WORKFLOW");
    });

    it("valida informações obrigatórias", () => {
      const engine = createEngine();
      const result = engine.createWorkflow({
        name: "",
        steps: [{ name: "", order: 1 }],
      });

      expect(result.success).toBe(false);

      if (result.success) {
        throw new Error("Fluxo inválido foi criado.");
      }

      expect(result.error.code).toBe("INVALID_WORKFLOW");
    });
  });

  describe("gerenciamento de etapas", () => {
    it("adiciona etapa somente em fluxo em rascunho", () => {
      const engine = createEngine();
      const workflow = createValidWorkflow(engine);
      const result = engine.addStep({
        workflow,
        name: "Notificar financeiro",
      });

      expect(result.success).toBe(true);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      expect(result.data.steps).toHaveLength(3);
      expect(result.data.steps[2]).toMatchObject({
        name: "Notificar financeiro",
        order: 3,
        status: WORKFLOW_STEP_STATUSES.pending,
      });
      expect(result.data.executionHistory.at(-1)?.type).toBe(
        WORKFLOW_EVENT_TYPES.workflowStepAdded,
      );
    });

    it("renomeia etapa em fluxo em rascunho", () => {
      const engine = createEngine();
      const workflow = createValidWorkflow(engine);
      const result = engine.renameStep({
        workflow,
        stepId: workflow.steps[0].id,
        name: "Solicitar cotação",
      });

      expect(result.success).toBe(true);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      expect(result.data.steps[0].name).toBe("Solicitar cotação");
      expect(result.data.executionHistory.at(-1)?.type).toBe(
        WORKFLOW_EVENT_TYPES.workflowStepRenamed,
      );
    });

    it("remove etapa e normaliza a ordem", () => {
      const engine = createEngine();
      const workflow = createValidWorkflow(engine);
      const result = engine.removeStep({
        workflow,
        stepId: workflow.steps[0].id,
      });

      expect(result.success).toBe(true);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      expect(result.data.steps).toHaveLength(1);
      expect(result.data.steps[0].order).toBe(1);
      expect(result.data.executionHistory.at(-1)?.type).toBe(
        WORKFLOW_EVENT_TYPES.workflowStepRemoved,
      );
    });

    it("impede remover a última etapa", () => {
      const engine = createEngine();
      const createdResult = engine.createWorkflow({
        name: "Fluxo simples",
        steps: [{ name: "Etapa única", order: 1 }],
      });

      expect(createdResult.success).toBe(true);

      if (!createdResult.success) {
        throw new Error(createdResult.error.message);
      }

      const result = engine.removeStep({
        workflow: createdResult.data,
        stepId: createdResult.data.steps[0].id,
      });

      expect(result.success).toBe(false);

      if (result.success) {
        throw new Error("Última etapa foi removida.");
      }

      expect(result.error.code).toBe("INVALID_OPERATION");
    });

    it("reordena etapas de forma atômica", () => {
      const engine = createEngine();
      const workflow = createValidWorkflow(engine);
      const invalidResult = engine.reorderSteps({
        workflow,
        orderedStepIds: [workflow.steps[1].id],
      });

      expect(invalidResult.success).toBe(false);

      if (invalidResult.success) {
        throw new Error("Reordenação inválida foi aceita.");
      }

      expect(workflow.steps.map((step) => step.id)).toEqual([
        workflow.steps[0].id,
        workflow.steps[1].id,
      ]);

      const result = engine.reorderSteps({
        workflow,
        orderedStepIds: [workflow.steps[1].id, workflow.steps[0].id],
      });

      expect(result.success).toBe(true);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      expect(result.data.steps.map((step) => step.id)).toEqual([
        workflow.steps[1].id,
        workflow.steps[0].id,
      ]);
      expect(result.data.steps.map((step) => step.order)).toEqual([1, 2]);
      expect(result.data.executionHistory.at(-1)?.type).toBe(
        WORKFLOW_EVENT_TYPES.workflowStepsReordered,
      );
    });

    it("bloqueia alterações de etapas fora do rascunho", () => {
      const engine = createEngine();
      const workflow = prepareWorkflow(engine, createValidWorkflow(engine));
      const result = engine.addStep({
        workflow,
        name: "Etapa indevida",
      });

      expect(result.success).toBe(false);

      if (result.success) {
        throw new Error("Etapa foi alterada fora do rascunho.");
      }

      expect(result.error.code).toBe("INVALID_OPERATION");
    });
  });

  describe("execução", () => {
    it("inicia um fluxo pronto", () => {
      const engine = createEngine();
      const workflow = startWorkflow(
        engine,
        prepareWorkflow(engine, createValidWorkflow(engine)),
      );

      expect(workflow.status).toBe(WORKFLOW_STATUSES.running);
      expect(workflow.currentStepId).toBe(workflow.steps[0].id);
      expect(workflow.executionHistory.at(-1)?.type).toBe(
        WORKFLOW_EVENT_TYPES.executionStarted,
      );
    });

    it("executa etapas na ordem correta", () => {
      const engine = createEngine();
      const runningWorkflow = startWorkflow(
        engine,
        prepareWorkflow(engine, createValidWorkflow(engine)),
      );
      const firstStepRunning = startCurrentStep(engine, runningWorkflow);
      const afterFirstStep = completeCurrentStep(engine, firstStepRunning);
      const secondStepRunning = startCurrentStep(engine, afterFirstStep);

      expect(firstStepRunning.steps[0].status).toBe(
        WORKFLOW_STEP_STATUSES.running,
      );
      expect(afterFirstStep.steps[0].status).toBe(
        WORKFLOW_STEP_STATUSES.completed,
      );
      expect(afterFirstStep.currentStepId).toBe(afterFirstStep.steps[1].id);
      expect(secondStepRunning.steps[1].status).toBe(
        WORKFLOW_STEP_STATUSES.running,
      );
    });

    it("impede execução fora da ordem", () => {
      const engine = createEngine();
      const workflow = startWorkflow(
        engine,
        prepareWorkflow(engine, createValidWorkflow(engine)),
      );
      const secondStep = workflow.steps[1];
      const result = engine.startStep({
        workflow,
        stepId: secondStep.id,
      });

      expect(result.success).toBe(false);

      if (result.success) {
        throw new Error("Etapa fora de ordem foi executada.");
      }

      expect(result.error.code).toBe("INVALID_TRANSITION");
      expect(result.events[0].type).toBe(
        WORKFLOW_STEP_EVENT_TYPES.stepTransitionBlocked,
      );
    });
  });

  describe("estados", () => {
    it("valida transições permitidas", () => {
      expect(ALLOWED_WORKFLOW_TRANSITIONS).toEqual(
        expect.arrayContaining([
          { from: WORKFLOW_STATUSES.draft, to: WORKFLOW_STATUSES.ready },
          { from: WORKFLOW_STATUSES.ready, to: WORKFLOW_STATUSES.running },
          {
            from: WORKFLOW_STATUSES.running,
            to: WORKFLOW_STATUSES.completed,
          },
          { from: WORKFLOW_STATUSES.running, to: WORKFLOW_STATUSES.failed },
          {
            from: WORKFLOW_STATUSES.running,
            to: WORKFLOW_STATUSES.cancelled,
          },
        ]),
      );
      expect(
        isWorkflowTransitionAllowed(
          WORKFLOW_STATUSES.ready,
          WORKFLOW_STATUSES.running,
        ),
      ).toBe(true);
    });

    it("bloqueia transições inválidas", () => {
      expect(
        isWorkflowTransitionAllowed(
          WORKFLOW_STATUSES.completed,
          WORKFLOW_STATUSES.running,
        ),
      ).toBe(false);
      expect(PROHIBITED_WORKFLOW_TRANSITIONS).toContainEqual({
        from: WORKFLOW_STATUSES.completed,
        to: WORKFLOW_STATUSES.running,
      });
    });
  });

  describe("falhas", () => {
    it("registra falha e mantém histórico", () => {
      const engine = createEngine();
      const workflow = startCurrentStep(
        engine,
        startWorkflow(engine, prepareWorkflow(engine, createValidWorkflow(engine))),
      );
      const result = engine.registerFailure({
        workflow,
        stepId: workflow.currentStepId,
        failure: { reason: "Serviço externo indisponível." },
      });

      expect(result.success).toBe(true);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      expect(result.data.status).toBe(WORKFLOW_STATUSES.failed);
      expect(result.data.failureReason).toBe("Serviço externo indisponível.");
      expect(result.data.executionHistory.map((event) => event.type)).toContain(
        WORKFLOW_EVENT_TYPES.workflowFailed,
      );
      expect(result.data.executionHistory.map((event) => event.type)).toContain(
        WORKFLOW_STEP_EVENT_TYPES.stepFailed,
      );
    });

    it("impede conclusão após falha", () => {
      const engine = createEngine();
      const runningStepWorkflow = startCurrentStep(
        engine,
        startWorkflow(engine, prepareWorkflow(engine, createValidWorkflow(engine))),
      );
      const failedResult = engine.registerFailure({
        workflow: runningStepWorkflow,
        stepId: runningStepWorkflow.currentStepId,
        failure: { reason: "Erro na etapa." },
      });

      expect(failedResult.success).toBe(true);

      if (!failedResult.success) {
        throw new Error(failedResult.error.message);
      }

      const completeResult = engine.completeStep({
        workflow: failedResult.data,
        stepId: runningStepWorkflow.currentStepId ?? "",
        result: { message: "Tentativa indevida." },
      });

      expect(completeResult.success).toBe(false);

      if (completeResult.success) {
        throw new Error("Workflow falho foi concluído.");
      }

      expect(completeResult.error.code).toBe("INVALID_TRANSITION");
    });
  });

  describe("cancelamento", () => {
    it("exige motivo de cancelamento", () => {
      const engine = createEngine();
      const workflow = prepareWorkflow(engine, createValidWorkflow(engine));
      const result = engine.cancelWorkflow({ workflow, reason: "   " });

      expect(result.success).toBe(false);

      if (result.success) {
        throw new Error("Workflow foi cancelado sem motivo.");
      }

      expect(result.error.code).toBe("MISSING_REQUIRED_REASON");
    });

    it("registra histórico de cancelamento", () => {
      const engine = createEngine();
      const workflow = prepareWorkflow(engine, createValidWorkflow(engine));
      const result = engine.cancelWorkflow({
        workflow,
        reason: "Solicitação duplicada.",
      });

      expect(result.success).toBe(true);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      expect(result.data.status).toBe(WORKFLOW_STATUSES.cancelled);
      expect(result.data.cancellationReason).toBe("Solicitação duplicada.");
      expect(result.data.executionHistory.at(-1)?.type).toBe(
        WORKFLOW_EVENT_TYPES.workflowCancelled,
      );
    });

    it("impede novas execuções após cancelamento", () => {
      const engine = createEngine();
      const cancelledResult = engine.cancelWorkflow({
        workflow: prepareWorkflow(engine, createValidWorkflow(engine)),
        reason: "Solicitação duplicada.",
      });

      expect(cancelledResult.success).toBe(true);

      if (!cancelledResult.success) {
        throw new Error(cancelledResult.error.message);
      }

      const result = engine.startExecution({ workflow: cancelledResult.data });

      expect(result.success).toBe(false);

      if (result.success) {
        throw new Error("Workflow cancelado foi executado.");
      }

      expect(result.error.code).toBe("INVALID_TRANSITION");
    });
  });

  describe("conclusão", () => {
    it("permite conclusão somente com todas as etapas concluídas", () => {
      const engine = createEngine();
      const workflow = startWorkflow(
        engine,
        prepareWorkflow(engine, createValidWorkflow(engine)),
      );
      const firstStepRunning = startCurrentStep(engine, workflow);
      const afterFirstStep = completeCurrentStep(engine, firstStepRunning);

      expect(afterFirstStep.status).toBe(WORKFLOW_STATUSES.running);

      const secondStepRunning = startCurrentStep(engine, afterFirstStep);
      const completedWorkflow = completeCurrentStep(engine, secondStepRunning);

      expect(completedWorkflow.status).toBe(WORKFLOW_STATUSES.completed);
      expect(completedWorkflow.currentStepId).toBeUndefined();
      expect(
        completedWorkflow.steps.every(
          (step) => step.status === WORKFLOW_STEP_STATUSES.completed,
        ),
      ).toBe(true);
      expect(completedWorkflow.executionHistory.at(-1)?.type).toBe(
        WORKFLOW_EVENT_TYPES.workflowCompleted,
      );
    });
  });
});
