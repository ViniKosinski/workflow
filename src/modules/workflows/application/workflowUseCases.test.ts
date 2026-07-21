import { describe, expect, it } from "vitest";
import { addWorkflowStep } from "@/modules/workflows/application/addWorkflowStep";
import { cancelPersistedWorkflow } from "@/modules/workflows/application/cancelPersistedWorkflow";
import { createWorkflow } from "@/modules/workflows/application/createWorkflow";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import { listPersistedWorkflows } from "@/modules/workflows/application/listPersistedWorkflows";
import { preparePersistedWorkflow } from "@/modules/workflows/application/preparePersistedWorkflow";
import { removeWorkflowStep } from "@/modules/workflows/application/removeWorkflowStep";
import { renameWorkflowStep } from "@/modules/workflows/application/renameWorkflowStep";
import { reorderWorkflowSteps } from "@/modules/workflows/application/reorderWorkflowSteps";
import { startPersistedWorkflow } from "@/modules/workflows/application/startPersistedWorkflow";
import type { WorkflowApplicationDependencies } from "@/modules/workflows/application/workflowApplicationTypes";
import {
  WorkflowBusinessError,
  WorkflowNotFoundError,
  WorkflowValidationError,
} from "@/modules/workflows/application/workflowUseCaseErrors";
import {
  WORKFLOW_STATUSES,
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
