import type { CompleteTaskInput, TaskApplicationDependencies } from "@/modules/tasks/application/taskApplicationTypes";
import { getMyTask } from "@/modules/tasks/application/getMyTask";
import { WorkflowBusinessError, WorkflowNotFoundError } from "@/modules/workflows/application/workflowUseCaseErrors";
import { WorkflowFormService } from "@/modules/workflowDefinitions/domain/workflowForm";

export async function completeTask(dependencies: TaskApplicationDependencies, input: CompleteTaskInput, userId: string) {
  return dependencies.transactions.run(async (transaction) => {
    const task = await getMyTask({ ...dependencies, tasks: transaction.tasks }, input.taskId, userId);
    if (input.expectedWorkflowId && input.expectedWorkflowId !== task.workflowId) throw new WorkflowNotFoundError(input.expectedWorkflowId);
    const { engine, repository } = transaction.workflow(task.organizationId);
    let workflow = await repository.findById(task.workflowId);
    if (!workflow) throw new WorkflowNotFoundError(task.workflowId);
    if (workflow.currentStepId !== task.id) throw new WorkflowBusinessError("A tarefa não é mais a etapa ativa.");

    if (input.formValues !== undefined) {
      if (!Number.isInteger(input.formVersion) || Number(input.formVersion) < 1) throw new WorkflowBusinessError("A versão do formulário é inválida.");
      if (!transaction.runForms) throw new WorkflowBusinessError("O formulário da execução não está disponível.");
      const runForms = transaction.runForms(task.organizationId);
      const form = await runForms.find(task.workflowId);
      if (!form) throw new WorkflowBusinessError("O formulário da execução não foi encontrado.");
      if (form.version !== input.formVersion || workflow.version !== input.formVersion) throw new WorkflowBusinessError("Os dados da execução foram alterados. Recarregue e tente novamente.");
      const normalized = (dependencies.forms ?? new WorkflowFormService()).normalizeValues(form.fields, input.formValues, true);
      await runForms.updateValues(task.workflowId, input.formVersion!, normalized, userId);
      workflow = await repository.findById(task.workflowId);
      if (!workflow) throw new WorkflowNotFoundError(task.workflowId);
    }

    if (workflow.steps.find((step) => step.id === task.id)?.status === "pending") {
      const started = engine.startStep({ workflow, stepId: task.id });
      if (!started.success) throw new WorkflowBusinessError(started.error.message);
      workflow = started.data;
    }

    const completed = engine.completeStep({
      workflow,
      stepId: task.id,
      executorUserId: userId,
      result: { message: input.message, selectedResult: input.selectedResult, observation: input.observation, metadata: input.metadata },
    });
    if (!completed.success) throw new WorkflowBusinessError(completed.error.message);
    return repository.update(completed.data);
  });
}
