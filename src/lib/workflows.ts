export type WorkflowSummary = {
  title: string;
  description: string;
  status: "Ativo" | "Em revisão" | "Planejado";
  steps: number;
  owner: string;
};

export const workflowSummaries: WorkflowSummary[] = [
  {
    title: "Aprovação de compras",
    description: "Fluxo para solicitação, validação financeira e aprovação final.",
    status: "Ativo",
    steps: 5,
    owner: "Operações",
  },
  {
    title: "Onboarding de clientes",
    description: "Acompanhamento das etapas iniciais após fechamento comercial.",
    status: "Em revisão",
    steps: 7,
    owner: "Sucesso do Cliente",
  },
  {
    title: "Gestão de contratos",
    description: "Base para organizar minutas, revisões jurídicas e assinaturas.",
    status: "Planejado",
    steps: 4,
    owner: "Jurídico",
  },
];
