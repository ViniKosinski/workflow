import { WorkflowDetailsPage } from "@/modules/workflows/presentation/pages/WorkflowDetailsPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <WorkflowDetailsPage workflowId={id} />;
}
