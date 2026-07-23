import type { OrganizationRole } from "@/modules/organizations/domain/membership";
import type { WorkflowDefinitionCommand } from "@/modules/workflowDefinitions/application/workflowDefinitionApplicationTypes";
import { HttpRequestError, parseJsonObject, requireString } from "@/shared/presentation/api/httpRequest";

const roles = new Set<OrganizationRole>(["owner", "admin", "editor", "viewer"]);

export async function parseWorkflowDefinitionPayload(request: Request): Promise<WorkflowDefinitionCommand> {
  const body = await parseJsonObject(request);
  if (!Array.isArray(body.steps) || body.steps.length < 1 || body.steps.length > 100) {
    throw new HttpRequestError(400, "A definição deve possuir entre 1 e 100 etapas.");
  }
  const steps = body.steps.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new HttpRequestError(400, `A etapa ${index + 1} é inválida.`);
    const step = raw as Record<string, unknown>;
    const assignee = step.assignee;
    if (!assignee || typeof assignee !== "object" || Array.isArray(assignee)) throw new HttpRequestError(400, `O responsável da etapa ${index + 1} é inválido.`);
    const assignment = assignee as Record<string, unknown>;
    const mappedAssignee = assignment.type === "user" && typeof assignment.userId === "string"
      ? { type: "user" as const, userId: assignment.userId }
      : assignment.type === "role" && typeof assignment.role === "string" && roles.has(assignment.role as OrganizationRole)
        ? { type: "role" as const, role: assignment.role as OrganizationRole }
        : null;
    if (!mappedAssignee) throw new HttpRequestError(400, `O responsável da etapa ${index + 1} é inválido.`);
    if (!Array.isArray(step.transitions) || step.transitions.length < 1 || step.transitions.length > 20) {
      throw new HttpRequestError(400, `As transições da etapa ${index + 1} são inválidas.`);
    }
    const transitions = step.transitions.map((rawTransition, transitionIndex) => {
      if (!rawTransition || typeof rawTransition !== "object" || Array.isArray(rawTransition)) {
        throw new HttpRequestError(400, `A transição ${transitionIndex + 1} é inválida.`);
      }
      const transition = rawTransition as Record<string, unknown>;
      const endsWorkflow = transition.endsWorkflow;
      if (typeof endsWorkflow !== "boolean") throw new HttpRequestError(400, "O encerramento da transição é inválido.");
      const targetStepId = transition.targetStepId;
      if (targetStepId !== undefined && typeof targetStepId !== "string") throw new HttpRequestError(400, "A etapa destino é inválida.");
      return {
        id: requireString(transition, "id", 64),
        name: requireString(transition, "name", 160),
        result: requireString(transition, "result", 120),
        description: typeof transition.description === "string" ? transition.description.slice(0, 2_000) : undefined,
        targetStepId,
        endsWorkflow,
      };
    });
    const order = step.order;
    if (!Number.isInteger(order) || Number(order) < 1) throw new HttpRequestError(400, `A ordem da etapa ${index + 1} é inválida.`);
    return {
      id: requireString(step, "id", 64),
      name: requireString(step, "name", 255),
      order: Number(order),
      assignee: mappedAssignee,
      transitions,
    };
  });
  return { name: requireString(body, "name", 255), steps };
}
