import { describe, expect, it } from "vitest";
import { addWorkflowStep } from "@/modules/workflows/application/addWorkflowStep";
import { cancelPersistedWorkflow } from "@/modules/workflows/application/cancelPersistedWorkflow";
import { completePersistedWorkflowStep } from "@/modules/workflows/application/completePersistedWorkflowStep";
import { createWorkflow } from "@/modules/workflows/application/createWorkflow";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import { listPersistedWorkflows } from "@/modules/workflows/application/listPersistedWorkflows";
import { preparePersistedWorkflow } from "@/modules/workflows/application/preparePersistedWorkflow";
import { registerPersistedWorkflowFailure } from "@/modules/workflows/application/registerPersistedWorkflowFailure";
import { removeWorkflowStep } from "@/modules/workflows/application/removeWorkflowStep";
import { renameWorkflowStep } from "@/modules/workflows/application/renameWorkflowStep";
import { reorderWorkflowSteps } from "@/modules/workflows/application/reorderWorkflowSteps";
import { startPersistedWorkflow } from "@/modules/workflows/application/startPersistedWorkflow";
import { startPersistedWorkflowStep } from "@/modules/workflows/application/startPersistedWorkflowStep";
import type { WorkflowApplicationDependencies } from "@/modules/workflows/application/workflowApplicationTypes";
import {
  WorkflowBusinessError,
  WorkflowNotFoundError,
  WorkflowValidationError,
} from "@/modules/workflows/application/workflowUseCaseErrors";
import {
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_STATUSES,
  WORKFLOW_STEP_EVENT_TYPES,
  WORKFLOW_STEP_STATUSES,
  type Workflow,
  type WorkflowEngineDependencies,
} from "@/modules/workflows/domain/workflowEngine";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import type {
  ListWorkflowsParams,
  WorkflowPersistenceRepository,
} from "@/modules/workflows/domain/workflowPersistenceRepository";

class FakeWorkflowRepository implements WorkflowPersistenceRepository {
  readonly workflows = new Map<string, Workflow>();
  readonly calls = {
    save: 0,
    findById: 0,
    list: 0,
    update: 0,
    exists: 0,
  };

  async save(workflow: Workflow) {
    this.calls.save += 1;
    this.workflows.set(workflow.id, workflow);

    return workflow;
  }

  async findById(workflowId: string) {
    this.calls.findById += 1;

    return this.workflows.get(workflowId) ?? null;
  }

  async list(params: ListWorkflowsParams = {}) {
    this.calls.list += 1;
    const workflows = [...this.workflows.values()];

    return params.status
      ? workflows.filter((workflow) => workflow.status === params.status)
      : workflows;
  }

  async update(workflow: Workflow) {
    this.calls.update += 1;
    this.workflows.set(workflow.id, workflow);

    return workflow;
  }

  async exists(workflowId: string) {
    this.calls.exists += 1;

    return this.workflows.has(workflowId);
  }
}

function createTestEngineDependencies(): WorkflowEngineDependencies {
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

function createDependencies() {
  const repository = new FakeWorkflowRepository();
  const dependencies: WorkflowApplicationDependencies = {
    workflowEngine: createWorkflowEngine(createTestEngineDependencies()),
    workflowRepository: repository,
  };

  return { dependencies, repository };
}

async function createPersistedWorkflow(
  dependencies: WorkflowApplicationDependencies,
) {
  return createWorkflow(dependencies, {
    name: "Aprovação de compras",
    steps: [
      { name: "Solicitar compra", order: 1 },
      { name: "Aprovar compra", order: 2 },
    ],
  });
}

describe("workflow application use cases", () => {
  it("cria fluxo usando motor e salva no repositório", async () => {
    const { dependencies, repository } = createDependencies();

    const workflow = await createPersistedWorkflow(dependencies);

    expect(workflow.status).toBe(WORKFLOW_STATUSES.draft);
    expect(repository.calls.save).toBe(1);
    expect(repository.workflows.get(workflow.id)).toEqual(workflow);
  });

  it("rejeita criação inválida sem chamar o repositório", async () => {
    const { dependencies, repository } = createDependencies();

    await expect(
      createWorkflow(dependencies, {
        name: "",
        steps: [],
      }),
    ).rejects.toBeInstanceOf(WorkflowValidationError);

    expect(repository.calls.save).toBe(0);
  });

  it("lista fluxos pelo repositório", async () => {
    const { dependencies, repository } = createDependencies();
    await createPersistedWorkflow(dependencies);

    const workflows = await listPersistedWorkflows(dependencies);

    expect(workflows).toHaveLength(1);
    expect(repository.calls.list).toBe(1);
  });

  it("busca fluxo por identificador", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);

    const foundWorkflow = await getPersistedWorkflowById(
      dependencies,
      workflow.id,
    );

    expect(foundWorkflow).toEqual(workflow);
    expect(repository.calls.findById).toBe(1);
  });

  it("retorna erro quando fluxo não existe", async () => {
    const { dependencies, repository } = createDependencies();

    await expect(
      getPersistedWorkflowById(dependencies, "missing-workflow"),
    ).rejects.toBeInstanceOf(WorkflowNotFoundError);

    expect(repository.calls.findById).toBe(1);
  });

  it("prepara fluxo e atualiza o repositório", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);

    const preparedWorkflow = await preparePersistedWorkflow(
      dependencies,
      workflow.id,
    );

    expect(preparedWorkflow.status).toBe(WORKFLOW_STATUSES.ready);
    expect(repository.calls.findById).toBe(1);
    expect(repository.calls.update).toBe(1);
    expect(repository.workflows.get(workflow.id)?.status).toBe(
      WORKFLOW_STATUSES.ready,
    );
  });

  it("adiciona etapa usando motor e atualiza o repositório", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);

    const updatedWorkflow = await addWorkflowStep(dependencies, {
      workflowId: workflow.id,
      name: "Notificar solicitante",
    });

    expect(updatedWorkflow.steps).toHaveLength(3);
    expect(updatedWorkflow.steps[2].name).toBe("Notificar solicitante");
    expect(repository.calls.findById).toBe(1);
    expect(repository.calls.update).toBe(1);
  });

  it("renomeia etapa usando operação explícita do motor", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);

    const updatedWorkflow = await renameWorkflowStep(dependencies, {
      workflowId: workflow.id,
      stepId: workflow.steps[0].id,
      name: "Solicitar cotação",
    });

    expect(updatedWorkflow.steps[0].name).toBe("Solicitar cotação");
    expect(repository.calls.update).toBe(1);
  });

  it("remove etapa e preserva ordem consistente", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);

    const updatedWorkflow = await removeWorkflowStep(dependencies, {
      workflowId: workflow.id,
      stepId: workflow.steps[0].id,
    });

    expect(updatedWorkflow.steps).toHaveLength(1);
    expect(updatedWorkflow.steps[0].order).toBe(1);
    expect(repository.calls.update).toBe(1);
  });

  it("reordena etapas em uma única atualização válida", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);

    const updatedWorkflow = await reorderWorkflowSteps(dependencies, {
      workflowId: workflow.id,
      orderedStepIds: [workflow.steps[1].id, workflow.steps[0].id],
    });

    expect(updatedWorkflow.steps.map((step) => step.id)).toEqual([
      workflow.steps[1].id,
      workflow.steps[0].id,
    ]);
    expect(updatedWorkflow.steps.map((step) => step.order)).toEqual([1, 2]);
    expect(repository.calls.update).toBe(1);
  });

  it("não persiste reordenação inválida", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);

    await expect(
      reorderWorkflowSteps(dependencies, {
        workflowId: workflow.id,
        orderedStepIds: [workflow.steps[0].id],
      }),
    ).rejects.toBeInstanceOf(WorkflowBusinessError);

    expect(repository.calls.update).toBe(0);
    expect(repository.workflows.get(workflow.id)?.steps).toEqual(workflow.steps);
  });

  it("bloqueia alteração de etapa em fluxo fora do rascunho", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);
    const preparedWorkflow = await preparePersistedWorkflow(
      dependencies,
      workflow.id,
    );

    await expect(
      addWorkflowStep(dependencies, {
        workflowId: preparedWorkflow.id,
        name: "Etapa bloqueada",
      }),
    ).rejects.toBeInstanceOf(WorkflowBusinessError);

    expect(repository.calls.update).toBe(1);
    expect(repository.workflows.get(workflow.id)?.steps).toHaveLength(2);
  });

  it("inicia execução somente após preparação", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);

    await expect(
      startPersistedWorkflow(dependencies, workflow.id),
    ).rejects.toBeInstanceOf(WorkflowBusinessError);

    expect(repository.calls.update).toBe(0);

    const preparedWorkflow = await preparePersistedWorkflow(
      dependencies,
      workflow.id,
    );
    const runningWorkflow = await startPersistedWorkflow(
      dependencies,
      preparedWorkflow.id,
    );

    expect(runningWorkflow.status).toBe(WORKFLOW_STATUSES.running);
    expect(runningWorkflow.currentStepId).toBe(runningWorkflow.steps[0].id);
    expect(repository.calls.update).toBe(2);
  });

  it("executa etapas na ordem e conclui o fluxo ao finalizar a última etapa", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);
    const preparedWorkflow = await preparePersistedWorkflow(
      dependencies,
      workflow.id,
    );
    const runningWorkflow = await startPersistedWorkflow(
      dependencies,
      preparedWorkflow.id,
    );

    const firstStepRunning = await startPersistedWorkflowStep(dependencies, {
      workflowId: runningWorkflow.id,
      stepId: runningWorkflow.currentStepId ?? "",
    });

    expect(firstStepRunning.steps[0].status).toBe(
      WORKFLOW_STEP_STATUSES.running,
    );

    const afterFirstStep = await completePersistedWorkflowStep(dependencies, {
      workflowId: firstStepRunning.id,
      stepId: firstStepRunning.currentStepId ?? "",
      result: { message: "Primeira etapa concluída." },
    });

    expect(afterFirstStep.status).toBe(WORKFLOW_STATUSES.running);
    expect(afterFirstStep.steps[0].status).toBe(
      WORKFLOW_STEP_STATUSES.completed,
    );
    expect(afterFirstStep.currentStepId).toBe(afterFirstStep.steps[1].id);

    const secondStepRunning = await startPersistedWorkflowStep(dependencies, {
      workflowId: afterFirstStep.id,
      stepId: afterFirstStep.currentStepId ?? "",
    });
    const completedWorkflow = await completePersistedWorkflowStep(dependencies, {
      workflowId: secondStepRunning.id,
      stepId: secondStepRunning.currentStepId ?? "",
      result: { message: "Segunda etapa concluída." },
    });

    expect(completedWorkflow.status).toBe(WORKFLOW_STATUSES.completed);
    expect(completedWorkflow.currentStepId).toBeUndefined();
    expect(completedWorkflow.steps.map((step) => step.status)).toEqual([
      WORKFLOW_STEP_STATUSES.completed,
      WORKFLOW_STEP_STATUSES.completed,
    ]);
    expect(completedWorkflow.executionHistory.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        WORKFLOW_EVENT_TYPES.executionStarted,
        WORKFLOW_STEP_EVENT_TYPES.stepStarted,
        WORKFLOW_STEP_EVENT_TYPES.stepCompleted,
        WORKFLOW_EVENT_TYPES.workflowCompleted,
      ]),
    );
    expect(repository.calls.update).toBe(6);
  });

  it("não atualiza o repositório ao tentar executar etapa fora da ordem", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);
    const preparedWorkflow = await preparePersistedWorkflow(
      dependencies,
      workflow.id,
    );
    const runningWorkflow = await startPersistedWorkflow(
      dependencies,
      preparedWorkflow.id,
    );
    const updatesBeforeInvalidAction = repository.calls.update;

    await expect(
      startPersistedWorkflowStep(dependencies, {
        workflowId: runningWorkflow.id,
        stepId: runningWorkflow.steps[1].id,
      }),
    ).rejects.toBeInstanceOf(WorkflowBusinessError);

    expect(repository.calls.update).toBe(updatesBeforeInvalidAction);
    expect(repository.workflows.get(workflow.id)?.steps[1].status).toBe(
      WORKFLOW_STEP_STATUSES.pending,
    );
  });

  it("registra falha da execução e atualiza histórico", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);
    const preparedWorkflow = await preparePersistedWorkflow(
      dependencies,
      workflow.id,
    );
    const runningWorkflow = await startPersistedWorkflow(
      dependencies,
      preparedWorkflow.id,
    );
    const stepRunningWorkflow = await startPersistedWorkflowStep(dependencies, {
      workflowId: runningWorkflow.id,
      stepId: runningWorkflow.currentStepId ?? "",
    });

    const failedWorkflow = await registerPersistedWorkflowFailure(dependencies, {
      workflowId: stepRunningWorkflow.id,
      stepId: stepRunningWorkflow.currentStepId,
      failure: { reason: "Serviço externo indisponível." },
    });

    expect(failedWorkflow.status).toBe(WORKFLOW_STATUSES.failed);
    expect(failedWorkflow.failureReason).toBe("Serviço externo indisponível.");
    expect(failedWorkflow.steps[0].status).toBe(WORKFLOW_STEP_STATUSES.failed);
    expect(failedWorkflow.executionHistory.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        WORKFLOW_STEP_EVENT_TYPES.stepFailed,
        WORKFLOW_EVENT_TYPES.workflowFailed,
      ]),
    );
    expect(repository.workflows.get(workflow.id)?.status).toBe(
      WORKFLOW_STATUSES.failed,
    );
  });

  it("não atualiza o repositório quando falha não possui motivo", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);
    const preparedWorkflow = await preparePersistedWorkflow(
      dependencies,
      workflow.id,
    );
    const runningWorkflow = await startPersistedWorkflow(
      dependencies,
      preparedWorkflow.id,
    );
    const updatesBeforeInvalidAction = repository.calls.update;

    await expect(
      registerPersistedWorkflowFailure(dependencies, {
        workflowId: runningWorkflow.id,
        failure: { reason: "   " },
      }),
    ).rejects.toBeInstanceOf(WorkflowValidationError);

    expect(repository.calls.update).toBe(updatesBeforeInvalidAction);
    expect(repository.workflows.get(workflow.id)?.status).toBe(
      WORKFLOW_STATUSES.running,
    );
  });

  it("cancela execução em andamento, limpa etapa atual e registra histórico", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);
    const preparedWorkflow = await preparePersistedWorkflow(
      dependencies,
      workflow.id,
    );
    const runningWorkflow = await startPersistedWorkflow(
      dependencies,
      preparedWorkflow.id,
    );

    const cancelledWorkflow = await cancelPersistedWorkflow(dependencies, {
      workflowId: runningWorkflow.id,
      reason: "Solicitação interrompida.",
    });

    expect(cancelledWorkflow.status).toBe(WORKFLOW_STATUSES.cancelled);
    expect(cancelledWorkflow.currentStepId).toBeUndefined();
    expect(cancelledWorkflow.cancellationReason).toBe(
      "Solicitação interrompida.",
    );
    expect(cancelledWorkflow.executionHistory.at(-1)?.type).toBe(
      WORKFLOW_EVENT_TYPES.workflowCancelled,
    );
    expect(repository.workflows.get(workflow.id)?.status).toBe(
      WORKFLOW_STATUSES.cancelled,
    );
  });

  it("cancela fluxo com motivo obrigatório e atualiza o repositório", async () => {
    const { dependencies, repository } = createDependencies();
    const workflow = await createPersistedWorkflow(dependencies);
    const preparedWorkflow = await preparePersistedWorkflow(
      dependencies,
      workflow.id,
    );

    await expect(
      cancelPersistedWorkflow(dependencies, {
        workflowId: preparedWorkflow.id,
        reason: "   ",
      }),
    ).rejects.toBeInstanceOf(WorkflowValidationError);

    const cancelledWorkflow = await cancelPersistedWorkflow(dependencies, {
      workflowId: preparedWorkflow.id,
      reason: "Solicitação duplicada.",
    });

    expect(cancelledWorkflow.status).toBe(WORKFLOW_STATUSES.cancelled);
    expect(cancelledWorkflow.cancellationReason).toBe("Solicitação duplicada.");
    expect(repository.workflows.get(workflow.id)?.status).toBe(
      WORKFLOW_STATUSES.cancelled,
    );
  });
});
