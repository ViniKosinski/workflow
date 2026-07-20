import type { WorkflowRepository } from "@/modules/workflows/domain/workflowRepository";

export const mockWorkflowRepository: WorkflowRepository = {
  listSummaries: () => [
    {
      id: "purchase-approval",
      title: "Aprovação de compras",
      description:
        "Fluxo para solicitação, validação financeira e aprovação final.",
      status: "Ativo",
      steps: 5,
      owner: "Operações",
    },
    {
      id: "customer-onboarding",
      title: "Onboarding de clientes",
      description:
        "Acompanhamento das etapas iniciais após fechamento comercial.",
      status: "Em revisão",
      steps: 7,
      owner: "Sucesso do Cliente",
    },
    {
      id: "contract-management",
      title: "Gestão de contratos",
      description:
        "Base para organizar minutas, revisões jurídicas e assinaturas.",
      status: "Planejado",
      steps: 4,
      owner: "Jurídico",
    },
  ],
};
