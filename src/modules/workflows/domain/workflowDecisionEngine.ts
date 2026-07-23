import type { Workflow, WorkflowStep, WorkflowStepTransition } from "@/modules/workflows/domain/workflowEngine";

export class WorkflowDecisionError extends Error {
  constructor(message: string) { super(message); this.name = "WorkflowDecisionError"; }
}

export class WorkflowDecisionEngine {
  resolve(step: WorkflowStep, selectedResult?: string): WorkflowStepTransition {
    const normalized = selectedResult?.trim();
    const transition = normalized
      ? step.transitions.find((candidate) => candidate.result === normalized)
      : step.transitions.length === 1 ? step.transitions[0] : undefined;
    if (!transition) throw new WorkflowDecisionError("O resultado escolhido não é válido para esta etapa.");
    return transition;
  }

  validate(workflow: Workflow) {
    const ids = new Set(workflow.steps.map((step) => step.id));
    const incoming = new Map(workflow.steps.map((step) => [step.id, 0]));
    let hasEnd = false;
    for (const step of workflow.steps) {
      const results = new Set<string>();
      for (const transition of step.transitions) {
        if (!transition.id.trim() || !transition.name.trim() || !transition.result.trim() || results.has(transition.result)) {
          throw new WorkflowDecisionError("As transições devem possuir nome e resultados únicos por etapa.");
        }
        results.add(transition.result);
        if (transition.endsWorkflow === Boolean(transition.targetStepId)) throw new WorkflowDecisionError("A transição deve possuir destino ou encerrar o workflow.");
        if (transition.endsWorkflow) { hasEnd = true; continue; }
        if (!transition.targetStepId || !ids.has(transition.targetStepId)) throw new WorkflowDecisionError("A etapa destino não existe.");
        if (transition.targetStepId === step.id) throw new WorkflowDecisionError("Loop imediato não é permitido.");
        incoming.set(transition.targetStepId, (incoming.get(transition.targetStepId) ?? 0) + 1);
      }
    }
    const starts = workflow.steps.filter((step) => incoming.get(step.id) === 0);
    if (starts.length !== 1) throw new WorkflowDecisionError("O workflow deve possuir exatamente uma etapa inicial.");
    if (!hasEnd) throw new WorkflowDecisionError("O workflow deve possuir ao menos um encerramento.");
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (stepId: string) => {
      if (visiting.has(stepId)) throw new WorkflowDecisionError("Ciclos não são suportados neste workflow.");
      if (visited.has(stepId)) return;
      visiting.add(stepId);
      const step = workflow.steps.find((candidate) => candidate.id === stepId)!;
      step.transitions.filter((transition) => transition.targetStepId).forEach((transition) => visit(transition.targetStepId!));
      visiting.delete(stepId); visited.add(stepId);
    };
    visit(starts[0].id);
    if (visited.size !== workflow.steps.length) throw new WorkflowDecisionError("O workflow possui etapa inalcançável.");
    return starts[0];
  }
}
