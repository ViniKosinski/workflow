"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type {
  WorkflowApiErrorResponse,
  WorkflowApiResponse,
  WorkflowFormStep,
} from "@/modules/workflows/presentation/types/workflowViewModels";
import { Button } from "@/shared/components/ui/Button";

function createInitialStep(): WorkflowFormStep {
  return {
    id: crypto.randomUUID(),
    name: "",
  };
}

export function WorkflowForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<WorkflowFormStep[]>([
    createInitialStep(),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          steps: steps.map((step, index) => ({
            name: step.name,
            order: index + 1,
          })),
        }),
      });
      const payload = (await response.json()) as
        | WorkflowApiResponse
        | WorkflowApiErrorResponse;

      if (!response.ok || !("workflow" in payload)) {
        setError(
          "message" in payload && payload.message
            ? payload.message
            : "Não foi possível criar o fluxo.",
        );
        return;
      }

      router.push(`/workflows/${payload.workflow.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex max-w-3xl flex-col gap-6" onSubmit={handleSubmit}>
      <div className="border border-slate-200 bg-white p-5">
        <label className="text-sm font-semibold text-slate-700" htmlFor="name">
          Nome do fluxo
        </label>
        <input
          className="mt-2 h-11 w-full border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          id="name"
          onChange={(event) => setName(event.target.value)}
          required
          type="text"
          value={name}
        />
      </div>

      <div className="border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-slate-700">Etapas</h2>
          <Button
            className="h-9 bg-slate-900 hover:bg-slate-800"
            onClick={() => setSteps((currentSteps) => [...currentSteps, createInitialStep()])}
            type="button"
          >
            Adicionar etapa
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {steps.map((step, index) => (
            <div className="flex items-center gap-3" key={step.id}>
              <span className="flex h-9 w-9 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
                {index + 1}
              </span>
              <input
                className="h-10 flex-1 border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                onChange={(event) =>
                  setSteps((currentSteps) =>
                    currentSteps.map((currentStep) =>
                      currentStep.id === step.id
                        ? { ...currentStep, name: event.target.value }
                        : currentStep,
                    ),
                  )
                }
                placeholder="Nome da etapa"
                required
                type="text"
                value={step.name}
              />
              <button
                className="h-10 px-3 text-sm font-semibold text-rose-600 disabled:text-slate-300"
                disabled={steps.length === 1}
                onClick={() =>
                  setSteps((currentSteps) =>
                    currentSteps.filter((currentStep) => currentStep.id !== step.id),
                  )
                }
                type="button"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <p className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Criando..." : "Criar fluxo"}
        </Button>
      </div>
    </form>
  );
}
