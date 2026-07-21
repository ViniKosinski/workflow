import {
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_STATUSES,
  WORKFLOW_STEP_EVENT_TYPES,
  WORKFLOW_STEP_STATUSES,
  type CancelWorkflowInput,
  type CompleteWorkflowStepInput,
  type CreateWorkflowInput,
  type AddWorkflowStepInput,
  type PrepareWorkflowInput,
  type RemoveWorkflowStepInput,
  type RenameWorkflowStepInput,
  type ReorderWorkflowStepsInput,
  type RegisterWorkflowFailureInput,
  type StartWorkflowExecutionInput,
  type StartWorkflowStepInput,
  type Workflow,
  type WorkflowEngineDependencies,
  type WorkflowEngineError,
  type WorkflowEngineResult,
  type WorkflowEngineService,
  type WorkflowExecutionEvent,
  type WorkflowId,
  type WorkflowLifecycleEvent,
  type WorkflowStateSnapshot,
  type WorkflowStatus,
  type WorkflowStep,
  type WorkflowStepExecutionEvent,
  type WorkflowStepId,
  canChangeWorkflowSteps,
  canExecuteWorkflow,
  isCancellationReasonValid,
  isTerminalWorkflowStatus,
  isWorkflowTransitionAllowed,
  isWorkflowValid,
} from "@/modules/workflows/domain/workflowEngine";

type EngineContext = {
  workflowId: WorkflowId;
  stepId?: WorkflowStepId;
};

export function createWorkflowEngine(
  dependencies: WorkflowEngineDependencies,
): WorkflowEngineService {
  const createLifecycleEvent = (
    context: EngineContext,
    event: Omit<WorkflowLifecycleEvent, "id" | "workflowId" | "timestamp">,
  ): WorkflowLifecycleEvent => ({
    id: dependencies.idGenerator.createEventId(),
    workflowId: context.workflowId,
    timestamp: dependencies.clock.now(),
    ...event,
  });

  const createStepEvent = (
    context: EngineContext & { stepId: WorkflowStepId },
    event: Omit<
      WorkflowStepExecutionEvent,
      "id" | "workflowId" | "stepId" | "timestamp"
    >,
  ): WorkflowStepExecutionEvent => ({
    id: dependencies.idGenerator.createEventId(),
    workflowId: context.workflowId,
    stepId: context.stepId,
    timestamp: dependencies.clock.now(),
    ...event,
  });

  const fail = <T>(
    error: WorkflowEngineError,
    events: ReadonlyArray<WorkflowExecutionEvent> = [],
  ): WorkflowEngineResult<T> => ({
    success: false,
    error,
    events,
  });

  const succeed = <T>(
    data: T,
    events: ReadonlyArray<WorkflowExecutionEvent>,
  ): WorkflowEngineResult<T> => ({
    success: true,
    data,
    events,
  });

  const blockWorkflowTransition = (
    workflow: Workflow,
    toStatus: WorkflowStatus,
    message: string,
  ) => {
    const event = createLifecycleEvent(
      { workflowId: workflow.id },
      {
        type: WORKFLOW_EVENT_TYPES.workflowTransitionBlocked,
        fromStatus: workflow.status,
        toStatus,
        message,
      },
    );

    return event;
  };

  const transitionWorkflow = (
    workflow: Workflow,
    toStatus: WorkflowStatus,
    event: WorkflowExecutionEvent,
    updates: Partial<Workflow> = {},
  ): Workflow => ({
    ...workflow,
    ...updates,
    status: toStatus,
    updatedAt: dependencies.clock.now(),
    executionHistory: [...workflow.executionHistory, event],
  });

  const hasIncompleteSteps = (workflow: Workflow) =>
    workflow.steps.some((step) => step.status !== WORKFLOW_STEP_STATUSES.completed);

  const getCurrentStep = (workflow: Workflow) =>
    workflow.steps.find((step) => step.id === workflow.currentStepId);

  const getNextPendingStep = (workflow: Workflow) =>
    [...workflow.steps]
      .sort((firstStep, secondStep) => firstStep.order - secondStep.order)
      .find((step) => step.status === WORKFLOW_STEP_STATUSES.pending);

  const replaceStep = (
    workflow: Workflow,
    stepId: WorkflowStepId,
    update: (step: WorkflowStep) => WorkflowStep,
  ) => workflow.steps.map((step) => (step.id === stepId ? update(step) : step));

  const normalizeStepOrders = (steps: ReadonlyArray<WorkflowStep>) =>
    [...steps]
      .sort((firstStep, secondStep) => firstStep.order - secondStep.order)
      .map((step, index) => ({
        ...step,
        order: index + 1,
      }));

  const blockStepChange = (workflow: Workflow, message: string) => {
    const event = createLifecycleEvent(
      { workflowId: workflow.id },
      {
        type: WORKFLOW_EVENT_TYPES.workflowTransitionBlocked,
        fromStatus: workflow.status,
        message,
      },
    );

    return event;
  };

  const validateDraftStepChange = (workflow: Workflow) => {
    if (!canChangeWorkflowSteps(workflow)) {
      return blockStepChange(
        workflow,
        "Etapas só podem ser alteradas em fluxos em rascunho.",
      );
    }

    return null;
  };

  return {
    createWorkflow(input: CreateWorkflowInput) {
      const workflowId = input.id ?? dependencies.idGenerator.createWorkflowId();
      const createdAt = dependencies.clock.now();
      const steps = [...input.steps]
        .sort((firstStep, secondStep) => firstStep.order - secondStep.order)
        .map<WorkflowStep>((step) => ({
          id: step.id ?? dependencies.idGenerator.createStepId(),
          name: step.name,
          order: step.order,
          status: WORKFLOW_STEP_STATUSES.pending,
        }));

      const event = createLifecycleEvent(
        { workflowId },
        {
          type: WORKFLOW_EVENT_TYPES.workflowCreated,
          toStatus: WORKFLOW_STATUSES.draft,
          message: "Workflow criado.",
        },
      );

      const workflow: Workflow = {
        id: workflowId,
        name: input.name,
        status: WORKFLOW_STATUSES.draft,
        steps,
        executionHistory: [event],
        createdAt,
        updatedAt: createdAt,
      };

      if (!isWorkflowValid(workflow)) {
        return fail<Workflow>(
          {
            code: "INVALID_WORKFLOW",
            message: "Workflow inválido.",
            event,
          },
          [event],
        );
      }

      return succeed(workflow, [event]);
    },

    addStep(input: AddWorkflowStepInput) {
      const { workflow } = input;
      const blockedEvent = validateDraftStepChange(workflow);

      if (blockedEvent) {
        return fail<Workflow>(
          {
            code: "INVALID_OPERATION",
            message: "Etapas só podem ser alteradas em fluxos em rascunho.",
            event: blockedEvent,
          },
          [blockedEvent],
        );
      }

      const stepName = input.name.trim();

      if (!stepName) {
        const event = blockStepChange(workflow, "Nome da etapa é obrigatório.");

        return fail<Workflow>(
          {
            code: "INVALID_STEP",
            message: "Nome da etapa é obrigatório.",
            event,
          },
          [event],
        );
      }

      const step: WorkflowStep = {
        id: dependencies.idGenerator.createStepId(),
        name: stepName,
        order: workflow.steps.length + 1,
        status: WORKFLOW_STEP_STATUSES.pending,
      };
      const event = createLifecycleEvent(
        { workflowId: workflow.id },
        {
          type: WORKFLOW_EVENT_TYPES.workflowStepAdded,
          message: "Etapa adicionada.",
          metadata: { stepId: step.id, stepName },
        },
      );

      const updatedWorkflow: Workflow = {
        ...workflow,
        steps: [...workflow.steps, step],
        updatedAt: dependencies.clock.now(),
        executionHistory: [...workflow.executionHistory, event],
      };

      if (!isWorkflowValid(updatedWorkflow)) {
        return fail<Workflow>(
          {
            code: "INVALID_WORKFLOW",
            message: "Workflow inválido.",
            event,
          },
          [event],
        );
      }

      return succeed(updatedWorkflow, [event]);
    },

    renameStep(input: RenameWorkflowStepInput) {
      const { workflow, stepId } = input;
      const blockedEvent = validateDraftStepChange(workflow);

      if (blockedEvent) {
        return fail<Workflow>(
          {
            code: "INVALID_OPERATION",
            message: "Etapas só podem ser alteradas em fluxos em rascunho.",
            event: blockedEvent,
          },
          [blockedEvent],
        );
      }

      const step = workflow.steps.find((candidate) => candidate.id === stepId);
      const stepName = input.name.trim();

      if (!step || !stepName) {
        const event = blockStepChange(
          workflow,
          !step ? "Etapa não encontrada." : "Nome da etapa é obrigatório.",
        );

        return fail<Workflow>(
          {
            code: "INVALID_STEP",
            message: !step ? "Etapa não encontrada." : "Nome da etapa é obrigatório.",
            event,
          },
          [event],
        );
      }

      const event = createLifecycleEvent(
        { workflowId: workflow.id },
        {
          type: WORKFLOW_EVENT_TYPES.workflowStepRenamed,
          message: "Etapa renomeada.",
          metadata: { stepId, previousName: step.name, stepName },
        },
      );

      const updatedWorkflow: Workflow = {
        ...workflow,
        updatedAt: dependencies.clock.now(),
        steps: replaceStep(workflow, stepId, (currentStep) => ({
          ...currentStep,
          name: stepName,
        })),
        executionHistory: [...workflow.executionHistory, event],
      };

      if (!isWorkflowValid(updatedWorkflow)) {
        return fail<Workflow>(
          {
            code: "INVALID_WORKFLOW",
            message: "Workflow inválido.",
            event,
          },
          [event],
        );
      }

      return succeed(updatedWorkflow, [event]);
    },

    removeStep(input: RemoveWorkflowStepInput) {
      const { workflow, stepId } = input;
      const blockedEvent = validateDraftStepChange(workflow);

      if (blockedEvent) {
        return fail<Workflow>(
          {
            code: "INVALID_OPERATION",
            message: "Etapas só podem ser alteradas em fluxos em rascunho.",
            event: blockedEvent,
          },
          [blockedEvent],
        );
      }

      const step = workflow.steps.find((candidate) => candidate.id === stepId);

      if (!step) {
        const event = blockStepChange(workflow, "Etapa não encontrada.");

        return fail<Workflow>(
          {
            code: "INVALID_STEP",
            message: "Etapa não encontrada.",
            event,
          },
          [event],
        );
      }

      if (workflow.steps.length === 1) {
        const event = blockStepChange(
          workflow,
          "O fluxo precisa manter pelo menos uma etapa.",
        );

        return fail<Workflow>(
          {
            code: "INVALID_OPERATION",
            message: "O fluxo precisa manter pelo menos uma etapa.",
            event,
          },
          [event],
        );
      }

      const event = createLifecycleEvent(
        { workflowId: workflow.id },
        {
          type: WORKFLOW_EVENT_TYPES.workflowStepRemoved,
          message: "Etapa removida.",
          metadata: { stepId, stepName: step.name },
        },
      );
      const updatedWorkflow: Workflow = {
        ...workflow,
        updatedAt: dependencies.clock.now(),
        steps: normalizeStepOrders(
          workflow.steps.filter((candidate) => candidate.id !== stepId),
        ),
        executionHistory: [...workflow.executionHistory, event],
      };

      if (!isWorkflowValid(updatedWorkflow)) {
        return fail<Workflow>(
          {
            code: "INVALID_WORKFLOW",
            message: "Workflow inválido.",
            event,
          },
          [event],
        );
      }

      return succeed(updatedWorkflow, [event]);
    },

    reorderSteps(input: ReorderWorkflowStepsInput) {
      const { workflow, orderedStepIds } = input;
      const blockedEvent = validateDraftStepChange(workflow);

      if (blockedEvent) {
        return fail<Workflow>(
          {
            code: "INVALID_OPERATION",
            message: "Etapas só podem ser alteradas em fluxos em rascunho.",
            event: blockedEvent,
          },
          [blockedEvent],
        );
      }

      const existingStepIds = new Set(workflow.steps.map((step) => step.id));
      const requestedStepIds = new Set(orderedStepIds);
      const hasAllSteps =
        orderedStepIds.length === workflow.steps.length &&
        requestedStepIds.size === workflow.steps.length &&
        orderedStepIds.every((stepId) => existingStepIds.has(stepId));

      if (!hasAllSteps) {
        const event = blockStepChange(workflow, "Nova ordem de etapas inválida.");

        return fail<Workflow>(
          {
            code: "INVALID_STEP",
            message: "Nova ordem de etapas inválida.",
            event,
          },
          [event],
        );
      }

      const stepsById = new Map(workflow.steps.map((step) => [step.id, step]));
      const reorderedSteps = orderedStepIds.map((stepId, index) => ({
        ...stepsById.get(stepId)!,
        order: index + 1,
      }));

      const event = createLifecycleEvent(
        { workflowId: workflow.id },
        {
          type: WORKFLOW_EVENT_TYPES.workflowStepsReordered,
          message: "Etapas reordenadas.",
          metadata: { orderedStepIds: orderedStepIds.join(",") },
        },
      );

      const updatedWorkflow: Workflow = {
        ...workflow,
        updatedAt: dependencies.clock.now(),
        steps: reorderedSteps,
        executionHistory: [...workflow.executionHistory, event],
      };

      if (!isWorkflowValid(updatedWorkflow)) {
        return fail<Workflow>(
          {
            code: "INVALID_WORKFLOW",
            message: "Workflow inválido.",
            event,
          },
          [event],
        );
      }

      return succeed(updatedWorkflow, [event]);
    },

    prepareWorkflow(input: PrepareWorkflowInput) {
      const { workflow } = input;

      if (!isWorkflowValid(workflow)) {
        const event = blockWorkflowTransition(
          workflow,
          WORKFLOW_STATUSES.ready,
          "Workflow inválido não pode ser preparado.",
        );

        return fail<Workflow>(
          {
            code: "INVALID_WORKFLOW",
            message: "Workflow inválido não pode ser preparado.",
            event,
          },
          [event],
        );
      }

      if (!isWorkflowTransitionAllowed(workflow.status, WORKFLOW_STATUSES.ready)) {
        const event = blockWorkflowTransition(
          workflow,
          WORKFLOW_STATUSES.ready,
          "Transição de estado inválida.",
        );

        return fail<Workflow>(
          {
            code: "INVALID_TRANSITION",
            message: "Transição de estado inválida.",
            event,
          },
          [event],
        );
      }

      const event = createLifecycleEvent(
        { workflowId: workflow.id },
        {
          type: WORKFLOW_EVENT_TYPES.workflowPrepared,
          fromStatus: workflow.status,
          toStatus: WORKFLOW_STATUSES.ready,
          message: "Workflow preparado.",
        },
      );

      return succeed(
        transitionWorkflow(workflow, WORKFLOW_STATUSES.ready, event),
        [event],
      );
    },

    startExecution(input: StartWorkflowExecutionInput) {
      const { workflow } = input;

      if (!canExecuteWorkflow(workflow)) {
        const event = blockWorkflowTransition(
          workflow,
          WORKFLOW_STATUSES.running,
          "Workflow não pode ser executado.",
        );

        return fail<Workflow>(
          {
            code: "INVALID_TRANSITION",
            message: "Workflow não pode ser executado.",
            event,
          },
          [event],
        );
      }

      const firstStep = getNextPendingStep(workflow);

      if (!firstStep) {
        const event = blockWorkflowTransition(
          workflow,
          WORKFLOW_STATUSES.running,
          "Workflow não possui etapa pendente.",
        );

        return fail<Workflow>(
          {
            code: "INVALID_WORKFLOW",
            message: "Workflow não possui etapa pendente.",
            event,
          },
          [event],
        );
      }

      const event = createLifecycleEvent(
        { workflowId: workflow.id },
        {
          type: WORKFLOW_EVENT_TYPES.executionStarted,
          fromStatus: workflow.status,
          toStatus: WORKFLOW_STATUSES.running,
          message: "Execução iniciada.",
        },
      );

      return succeed(
        transitionWorkflow(workflow, WORKFLOW_STATUSES.running, event, {
          currentStepId: firstStep.id,
          startedAt: dependencies.clock.now(),
        }),
        [event],
      );
    },

    startStep(input: StartWorkflowStepInput) {
      const { workflow, stepId } = input;
      const step = workflow.steps.find((candidate) => candidate.id === stepId);

      if (workflow.status !== WORKFLOW_STATUSES.running || !step) {
        const event = createStepEvent(
          { workflowId: workflow.id, stepId },
          {
            type: WORKFLOW_STEP_EVENT_TYPES.stepTransitionBlocked,
            message: "Etapa não pode ser executada.",
          },
        );

        return fail<Workflow>(
          {
            code: "INVALID_STEP",
            message: "Etapa não pode ser executada.",
            event,
          },
          [event],
        );
      }

      if (workflow.currentStepId !== stepId || step.status !== WORKFLOW_STEP_STATUSES.pending) {
        const event = createStepEvent(
          { workflowId: workflow.id, stepId },
          {
            type: WORKFLOW_STEP_EVENT_TYPES.stepTransitionBlocked,
            fromStatus: step.status,
            toStatus: WORKFLOW_STEP_STATUSES.running,
            message: "Etapa fora da ordem de execução.",
          },
        );

        return fail<Workflow>(
          {
            code: "INVALID_TRANSITION",
            message: "Etapa fora da ordem de execução.",
            event,
          },
          [event],
        );
      }

      const event = createStepEvent(
        { workflowId: workflow.id, stepId },
        {
          type: WORKFLOW_STEP_EVENT_TYPES.stepStarted,
          fromStatus: step.status,
          toStatus: WORKFLOW_STEP_STATUSES.running,
          message: "Etapa iniciada.",
        },
      );

      const updatedWorkflow: Workflow = {
        ...workflow,
        updatedAt: dependencies.clock.now(),
        steps: replaceStep(workflow, stepId, (currentStep) => ({
          ...currentStep,
          status: WORKFLOW_STEP_STATUSES.running,
          startedAt: dependencies.clock.now(),
        })),
        executionHistory: [...workflow.executionHistory, event],
      };

      return succeed(updatedWorkflow, [event]);
    },

    completeStep(input: CompleteWorkflowStepInput) {
      const { workflow, stepId, result } = input;
      const step = workflow.steps.find((candidate) => candidate.id === stepId);

      if (
        workflow.status !== WORKFLOW_STATUSES.running ||
        workflow.currentStepId !== stepId ||
        !step ||
        step.status !== WORKFLOW_STEP_STATUSES.running
      ) {
        const event = step
          ? createStepEvent(
              { workflowId: workflow.id, stepId },
              {
                type: WORKFLOW_STEP_EVENT_TYPES.stepTransitionBlocked,
                fromStatus: step.status,
                toStatus: WORKFLOW_STEP_STATUSES.completed,
                message: "Etapa não pode ser concluída.",
              },
            )
          : blockWorkflowTransition(
              workflow,
              WORKFLOW_STATUSES.completed,
              "Etapa não pode ser concluída.",
            );

        return fail<Workflow>(
          {
            code: "INVALID_TRANSITION",
            message: "Etapa não pode ser concluída.",
            event,
          },
          [event],
        );
      }

      const stepEvent = createStepEvent(
        { workflowId: workflow.id, stepId },
        {
          type: WORKFLOW_STEP_EVENT_TYPES.stepCompleted,
          fromStatus: step.status,
          toStatus: WORKFLOW_STEP_STATUSES.completed,
          message: "Etapa concluída.",
          metadata: result.metadata,
        },
      );

      const workflowWithCompletedStep: Workflow = {
        ...workflow,
        updatedAt: dependencies.clock.now(),
        steps: replaceStep(workflow, stepId, (currentStep) => ({
          ...currentStep,
          status: WORKFLOW_STEP_STATUSES.completed,
          executionResult: result,
          finishedAt: dependencies.clock.now(),
        })),
        executionHistory: [...workflow.executionHistory, stepEvent],
      };

      const nextStep = getNextPendingStep(workflowWithCompletedStep);

      if (nextStep) {
        const updatedWorkflow: Workflow = {
          ...workflowWithCompletedStep,
          currentStepId: nextStep.id,
        };

        return succeed(updatedWorkflow, [stepEvent]);
      }

      if (hasIncompleteSteps(workflowWithCompletedStep)) {
        const event = blockWorkflowTransition(
          workflowWithCompletedStep,
          WORKFLOW_STATUSES.completed,
          "Workflow possui etapas pendentes.",
        );

        return fail<Workflow>(
          {
            code: "INVALID_WORKFLOW",
            message: "Workflow possui etapas pendentes.",
            event,
          },
          [event],
        );
      }

      const workflowEvent = createLifecycleEvent(
        { workflowId: workflow.id },
        {
          type: WORKFLOW_EVENT_TYPES.workflowCompleted,
          fromStatus: workflow.status,
          toStatus: WORKFLOW_STATUSES.completed,
          message: "Workflow concluído.",
        },
      );

      return succeed(
        transitionWorkflow(
          {
            ...workflowWithCompletedStep,
            currentStepId: undefined,
          },
          WORKFLOW_STATUSES.completed,
          workflowEvent,
          {
            finishedAt: dependencies.clock.now(),
          },
        ),
        [stepEvent, workflowEvent],
      );
    },

    registerFailure(input: RegisterWorkflowFailureInput) {
      const { workflow, failure } = input;
      const stepId = input.stepId ?? workflow.currentStepId;

      if (isTerminalWorkflowStatus(workflow.status)) {
        const event = blockWorkflowTransition(
          workflow,
          WORKFLOW_STATUSES.failed,
          "Workflow finalizado não pode registrar falha.",
        );

        return fail<Workflow>(
          {
            code: "WORKFLOW_ALREADY_FINISHED",
            message: "Workflow finalizado não pode registrar falha.",
            event,
          },
          [event],
        );
      }

      if (!failure.reason.trim() || workflow.status !== WORKFLOW_STATUSES.running) {
        const event = blockWorkflowTransition(
          workflow,
          WORKFLOW_STATUSES.failed,
          "Falha não pode ser registrada.",
        );

        return fail<Workflow>(
          {
            code: "INVALID_OPERATION",
            message: "Falha não pode ser registrada.",
            event,
          },
          [event],
        );
      }

      const step = stepId ? workflow.steps.find((candidate) => candidate.id === stepId) : undefined;
      const stepEvent =
        step && stepId
          ? createStepEvent(
              { workflowId: workflow.id, stepId },
              {
                type: WORKFLOW_STEP_EVENT_TYPES.stepFailed,
                fromStatus: step.status,
                toStatus: WORKFLOW_STEP_STATUSES.failed,
                message: "Etapa falhou.",
                error: failure.reason,
                metadata: failure.metadata,
              },
            )
          : undefined;

      const workflowEvent = createLifecycleEvent(
        { workflowId: workflow.id },
        {
          type: WORKFLOW_EVENT_TYPES.workflowFailed,
          fromStatus: workflow.status,
          toStatus: WORKFLOW_STATUSES.failed,
          message: "Workflow falhou.",
          error: failure.reason,
          metadata: failure.metadata,
        },
      );

      const events = stepEvent ? [stepEvent, workflowEvent] : [workflowEvent];

      const workflowWithFailedStep: Workflow = {
        ...workflow,
        steps:
          step && stepId
            ? replaceStep(workflow, stepId, (currentStep) => ({
                ...currentStep,
                status: WORKFLOW_STEP_STATUSES.failed,
                errorMessage: failure.reason,
                finishedAt: dependencies.clock.now(),
              }))
            : workflow.steps,
        executionHistory: [...workflow.executionHistory, ...events],
      };

      return succeed(
        {
          ...workflowWithFailedStep,
          status: WORKFLOW_STATUSES.failed,
          updatedAt: dependencies.clock.now(),
          finishedAt: dependencies.clock.now(),
          failureReason: failure.reason,
        },
        events,
      );
    },

    cancelWorkflow(input: CancelWorkflowInput) {
      const { workflow, reason } = input;

      if (!isCancellationReasonValid(reason)) {
        const event = blockWorkflowTransition(
          workflow,
          WORKFLOW_STATUSES.cancelled,
          "Motivo de cancelamento é obrigatório.",
        );

        return fail<Workflow>(
          {
            code: "MISSING_REQUIRED_REASON",
            message: "Motivo de cancelamento é obrigatório.",
            event,
          },
          [event],
        );
      }

      if (!isWorkflowTransitionAllowed(workflow.status, WORKFLOW_STATUSES.cancelled)) {
        const event = blockWorkflowTransition(
          workflow,
          WORKFLOW_STATUSES.cancelled,
          "Workflow não pode ser cancelado.",
        );

        return fail<Workflow>(
          {
            code: "INVALID_TRANSITION",
            message: "Workflow não pode ser cancelado.",
            event,
          },
          [event],
        );
      }

      const event = createLifecycleEvent(
        { workflowId: workflow.id },
        {
          type: WORKFLOW_EVENT_TYPES.workflowCancelled,
          fromStatus: workflow.status,
          toStatus: WORKFLOW_STATUSES.cancelled,
          message: "Workflow cancelado.",
          metadata: { reason },
        },
      );

      return succeed(
        transitionWorkflow(workflow, WORKFLOW_STATUSES.cancelled, event, {
          currentStepId: undefined,
          cancellationReason: reason,
          finishedAt: dependencies.clock.now(),
        }),
        [event],
      );
    },

    getWorkflowState(input) {
      const currentStep = getCurrentStep(input.workflow);

      return succeed<WorkflowStateSnapshot>(
        {
          workflowId: input.workflow.id,
          status: input.workflow.status,
          currentStep,
          steps: input.workflow.steps,
          executionHistory: input.workflow.executionHistory,
        },
        [],
      );
    },
  };
}
