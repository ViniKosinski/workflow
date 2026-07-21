"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import type {
  Workflow,
  WorkflowStep,
} from "@/modules/workflows/domain/workflowEngine";
import type {
  WorkflowApiErrorResponse,
  WorkflowApiResponse,
} from "@/modules/workflows/presentation/types/workflowViewModels";
import { Button } from "@/shared/components/ui/Button";

type DraftWorkflowStepsEditorProps = {
  workflow: Workflow;
};

type StepNamesById = Record<string, string>;

function mapStepNames(steps: ReadonlyArray<WorkflowStep>): StepNamesById {
  return Object.fromEntries(steps.map((step) => [step.id, step.name]));
}

export function DraftWorkflowStepsEditor({
  workflow,
}: DraftWorkflowStepsEditorProps) {
  const router = useRouter();
  const [steps, setSteps] = useState<ReadonlyArray<WorkflowStep>>(
    workflow.steps,
  );
  const [stepNames, setStepNames] = useState<StepNamesById>(
    mapStepNames(workflow.steps),
  );
  const [newStepName, setNewStepName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderedSteps = useMemo(
    () => [...steps].sort((firstStep, secondStep) => firstStep.order - secondStep.order),
    [steps],
  );

  async function persistStepChange(path: string, init: RequestInit) {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(path, init);
      const payload = (await response.json().catch(() => ({}))) as
        | WorkflowApiResponse
        | WorkflowApiErrorResponse;

      if (!response.ok || !("workflow" in payload)) {
        setError(
          "message" in payload && payload.message
            ? payload.message
            : "NÃ£o foi possÃ­vel atualizar as etapas.",
        );
        return null;
      }

      setSteps(payload.workflow.steps);
      setStepNames(mapStepNames(payload.workflow.steps));
      router.refresh();

      return payload.workflow;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const updatedWorkflow = await persistStepChange(
      `/api/workflows/${workflow.id}/steps`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newStepName }),
      },
    );

    if (updatedWorkflow) {
      setNewStepName("");
    }
  }

  async function renameStep(stepId: string) {
    await persistStepChange(`/api/workflows/${workflow.id}/steps/${stepId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: stepNames[stepId] ?? "" }),
    });
  }

  async function removeStep(stepId: string) {
    await persistStepChange(`/api/workflows/${workflow.id}/steps/${stepId}`, {
      method: "DELETE",
    });
  }

  async function moveStep(stepId: string, direction: -1 | 1) {
    const currentIndex = orderedSteps.findIndex((step) => step.id === stepId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedSteps.length) {
      return;
    }

    const orderedStepIds = orderedSteps.map((step) => step.id);
    const currentStepId = orderedStepIds[currentIndex];
    orderedStepIds[currentIndex] = orderedStepIds[targetIndex];
    orderedStepIds[targetIndex] = currentStepId;

    await persistStepChange(`/api/workflows/${workflow.id}/steps/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderedStepIds }),
    });
  }

  return (
    <div className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Etapas</h2>
      </div>

      <div className="divide-y divide-slate-100">
        {orderedSteps.map((step, index) => (
          <div className="flex flex-col gap-3 px-5 py-4" key={step.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
                {index + 1}
              </span>
              <input
                className="h-10 min-w-0 flex-1 border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                disabled={isSubmitting}
                onChange={(event) =>
                  setStepNames((currentStepNames) => ({
                    ...currentStepNames,
                    [step.id]: event.target.value,
                  }))
                }
                required
                type="text"
                value={stepNames[step.id] ?? ""}
              />
              <div className="grid grid-cols-4 gap-2 md:flex md:items-center">
                <button
                  className="h-10 border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:text-slate-300"
                  disabled={isSubmitting || index === 0}
                  onClick={() => void moveStep(step.id, -1)}
                  type="button"
                >
                  Subir
                </button>
                <button
                  className="h-10 border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:text-slate-300"
                  disabled={isSubmitting || index === orderedSteps.length - 1}
                  onClick={() => void moveStep(step.id, 1)}
                  type="button"
                >
                  Descer
                </button>
                <button
                  className="h-10 border border-brand-200 px-3 text-sm font-semibold text-brand-700 disabled:text-slate-300"
                  disabled={isSubmitting}
                  onClick={() => void renameStep(step.id)}
                  type="button"
                >
                  Salvar
                </button>
                <button
                  className="h-10 px-3 text-sm font-semibold text-rose-600 disabled:text-slate-300"
                  disabled={isSubmitting || orderedSteps.length === 1}
                  onClick={() => void removeStep(step.id)}
                  type="button"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form
        className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 md:flex-row"
        onSubmit={handleAddStep}
      >
        <input
          className="h-10 min-w-0 flex-1 border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          disabled={isSubmitting}
          onChange={(event) => setNewStepName(event.target.value)}
          placeholder="Nome da nova etapa"
          required
          type="text"
          value={newStepName}
        />
        <Button disabled={isSubmitting} type="submit">
          Adicionar etapa
        </Button>
      </form>

      {error ? (
        <p className="border-t border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
