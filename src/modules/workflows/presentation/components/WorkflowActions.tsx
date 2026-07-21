"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  WORKFLOW_STATUSES,
  WORKFLOW_STEP_STATUSES,
  type Workflow,
} from "@/modules/workflows/domain/workflowEngine";
import type { WorkflowApiResponse } from "@/modules/workflows/presentation/types/workflowViewModels";
import type { WorkflowApiErrorResponse } from "@/modules/workflows/presentation/types/workflowViewModels";
import { Button } from "@/shared/components/ui/Button";

type WorkflowActionsProps = {
  workflow: Workflow;
};

export function WorkflowActions({ workflow }: WorkflowActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function runAction(path: string, body?: unknown) {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: body
          ? {
              "Content-Type": "application/json",
            }
          : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json().catch(() => ({}))) as
        | WorkflowApiResponse
        | WorkflowApiErrorResponse;

      if (!response.ok || !("workflow" in payload)) {
        setError(
          "message" in payload && payload.message
            ? payload.message
            : "Não foi possível executar a ação.",
        );
        return;
      }

      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentStep = workflow.steps.find(
    (step) => step.id === workflow.currentStepId,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {workflow.status === WORKFLOW_STATUSES.draft ? (
        <Button
          disabled={isSubmitting}
          onClick={() => runAction(`/api/workflows/${workflow.id}/prepare`)}
          type="button"
        >
          Preparar
        </Button>
      ) : null}

      {workflow.status === WORKFLOW_STATUSES.ready ? (
        <Button
          disabled={isSubmitting}
          onClick={() => runAction(`/api/workflows/${workflow.id}/start`)}
          type="button"
        >
          Iniciar execução
        </Button>
      ) : null}

      {currentStep?.status === WORKFLOW_STEP_STATUSES.pending ? (
        <Button
          disabled={isSubmitting}
          onClick={() =>
            runAction(
              `/api/workflows/${workflow.id}/steps/${currentStep.id}/start`,
            )
          }
          type="button"
        >
          Iniciar etapa atual
        </Button>
      ) : null}

      {currentStep?.status === WORKFLOW_STEP_STATUSES.running ? (
        <Button
          disabled={isSubmitting}
          onClick={() =>
            runAction(
              `/api/workflows/${workflow.id}/steps/${currentStep.id}/complete`,
            )
          }
          type="button"
        >
          Concluir etapa atual
        </Button>
      ) : null}

      {workflow.status === WORKFLOW_STATUSES.running ||
      workflow.status === WORKFLOW_STATUSES.ready ||
      workflow.status === WORKFLOW_STATUSES.draft ? (
        <button
          className="h-10 px-3 text-sm font-semibold text-rose-600 disabled:text-slate-300"
          disabled={isSubmitting}
          onClick={() => {
            const reason = window.prompt("Motivo do cancelamento");

            if (reason !== null) {
              void runAction(`/api/workflows/${workflow.id}/cancel`, { reason });
            }
          }}
          type="button"
        >
          Cancelar
        </button>
      ) : null}

      {workflow.status === WORKFLOW_STATUSES.running ? (
        <button
          className="h-10 px-3 text-sm font-semibold text-slate-700 disabled:text-slate-300"
          disabled={isSubmitting}
          onClick={() => {
            const reason = window.prompt("Motivo da falha");

            if (reason !== null) {
              void runAction(`/api/workflows/${workflow.id}/fail`, {
                reason,
                stepId: workflow.currentStepId,
              });
            }
          }}
          type="button"
        >
          Registrar falha
        </button>
      ) : null}

      {error ? <p className="w-full text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
