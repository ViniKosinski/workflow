export type WorkflowStatus = "Ativo" | "Em revisão" | "Planejado";

export type WorkflowSummary = {
  id: string;
  title: string;
  description: string;
  status: WorkflowStatus;
  steps: number;
  owner: string;
};
