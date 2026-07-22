"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  WORKFLOW_STATUSES,
  WORKFLOW_STEP_STATUSES,
  type Workflow,
} from "@/modules/workflows/domain/workflowEngine";
import type {
  WorkflowApiErrorResponse,
  WorkflowApiResponse,
} from "@/modules/workflows/presentation/types/workflowViewModels";
import { WorkflowStatusBadge } from "@/modules/workflows/presentation/components/WorkflowStatusBadge";
import { Button } from "@/shared/components/ui/Button";

type WorkflowExecutionPanelProps = {
  workflow: Workflow;
};

type PendingForm = "failure" | "cancellation" | null;

function getExecutionSummary(workflow: Workflow) {
  const completedSteps = workflow.steps.filter(
    (step) => step.status === WORKFLOW_STEP_STATUSES.completed,
  ).length;
  const totalSteps = workflow.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return {
    completedSteps,
    totalSteps,
    progress,
  };
}

export function WorkflowExecutionPanel({ workflow }: WorkflowExecutionPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingForm, setPendingForm] = useState<PendingForm>(null);
  const [reason, setReason] = useState("");

  const currentStep = workflow.steps.find(
    (step) => step.id === workflow.currentStepId,
  );
  const summary = useMemo(() => getExecutionSummary(workflow), [workflow]);

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
        return false;
      }

      setPendingForm(null);
      setReason("");
      router.refresh();
      return true;
    } catch {
      setError("Não foi possível conectar ao servidor.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitReasonAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reason.trim()) {
      setError(
        pendingForm === "failure"
          ? "Informe o motivo da falha."
          : "Informe o motivo do cancelamento.",
      );
      return;
    }

    if (pendingForm === "failure") {
      await runAction(`/api/workflows/${workflow.id}/fail`, {
        reason,
        stepId: workflow.currentStepId,
      });
      return;
    }

    if (pendingForm === "cancellation") {
      await runAction(`/api/workflows/${workflow.id}/cancel`, { reason });
    }
  }

  const canPrepare = workflow.status === WORKFLOW_STATUSES.draft;
  const canStartExecution = workflow.status === WORKFLOW_STATUSES.ready;
  const canStartStep =
    workflow.status === WORKFLOW_STATUSES.running &&
    currentStep?.status === WORKFLOW_STEP_STATUSES.pending;
  const canCompleteStep =
    workflow.status === WORKFLOW_STATUSES.running &&
    currentStep?.status === WORKFLOW_STEP_STATUSES.running;
  const canFail = workflow.status === WORKFLOW_STATUSES.running;
  const canCancel =
    workflow.status === WORKFLOW_STATUSES.draft ||
    workflow.status === WORKFLOW_STATUSES.ready ||
    workflow.status === WORKFLOW_STATUSES.running;
  const isFinished =
    workflow.status === WORKFLOW_STATUSES.completed ||
    workflow.status === WORKFLOW_STATUSES.failed ||
    workflow.status === WORKFLOW_STATUSES.cancelled;

  return (
    <div className="border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-950">Execução</h2>
          <WorkflowStatusBadge status={workflow.status} />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              {summary.completedSteps} de {summary.totalSteps} etapas concluídas
            </span>
            <span>{summary.progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden bg-slate-100">
            <div
              className="h-full bg-brand-600 transition-all"
              style={{ width: `${summary.progress}%` }}
            />
          </div>
        </div>

        {currentStep ? (
          <div className="border border-brand-100 bg-brand-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase text-brand-700">
              Etapa atual
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {currentStep.order}. {currentStep.name}
            </p>
          </div>
        ) : null}

        {isFinished ? (
          <p className="text-sm text-slate-600">
            Este fluxo está finalizado e disponível apenas para visualização.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {canPrepare ? (
          <Button
            disabled={isSubmitting}
            onClick={() => void runAction(`/api/workflows/${workflow.id}/prepare`)}
            type="button"
          >
            Preparar
          </Button>
        ) : null}

        {canStartExecution ? (
          <Button
            disabled={isSubmitting}
            onClick={() => void runAction(`/api/workflows/${workflow.id}/start`)}
            type="button"
          >
            Iniciar execução
          </Button>
        ) : null}

        {canStartStep && currentStep ? (
          <Button
            disabled={isSubmitting}
            onClick={() =>
              void runAction(
                `/api/workflows/${workflow.id}/steps/${currentStep.id}/start`,
              )
            }
            type="button"
          >
            Iniciar etapa
          </Button>
        ) : null}

        {canCompleteStep && currentStep ? (
          <Button
            disabled={isSubmitting}
            onClick={() =>
              void runAction(
                `/api/workflows/${workflow.id}/steps/${currentStep.id}/complete`,
              )
            }
            type="button"
          >
            Concluir etapa
          </Button>
        ) : null}

        {canFail ? (
          <button
            className="h-10 border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:text-slate-300"
            disabled={isSubmitting}
            onClick={() => {
              setPendingForm("failure");
              setReason("");
              setError(null);
            }}
            type="button"
          >
            Registrar falha
          </button>
        ) : null}

        {canCancel ? (
          <button
            className="h-10 px-3 text-sm font-semibold text-rose-600 disabled:text-slate-300"
            disabled={isSubmitting}
            onClick={() => {
              setPendingForm("cancellation");
              setReason("");
              setError(null);
            }}
            type="button"
          >
            Cancelar execução
          </button>
        ) : null}
      </div>

      {pendingForm ? (
        <form
          className="mt-4 border border-slate-200 bg-slate-50 p-4"
          onSubmit={submitReasonAction}
        >
          <label
            className="text-sm font-semibold text-slate-700"
            htmlFor="execution-reason"
          >
            {pendingForm === "failure"
              ? "Motivo da falha"
              : "Motivo do cancelamento"}
          </label>
          <textarea
            className="mt-2 min-h-24 w-full resize-y border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            disabled={isSubmitting}
            id="execution-reason"
            onChange={(event) => setReason(event.target.value)}
            required
            value={reason}
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              className="h-10 px-3 text-sm font-semibold text-slate-600 disabled:text-slate-300"
              disabled={isSubmitting}
              onClick={() => {
                setPendingForm(null);
                setReason("");
                setError(null);
              }}
              type="button"
            >
              Voltar
            </button>
            <Button
              className={
                pendingForm === "cancellation"
                  ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                  : ""
              }
              disabled={isSubmitting}
              type="submit"
            >
              {pendingForm === "failure" ? "Confirmar falha" : "Confirmar cancelamento"}
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="mt-4 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
