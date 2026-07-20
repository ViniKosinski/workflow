export type WorkflowSummaryStatus = "Ativo" | "Em revisão" | "Planejado";

export type WorkflowSummary = {
  id: string;
  title: string;
  description: string;
  status: WorkflowSummaryStatus;
  steps: number;
  owner: string;
};
