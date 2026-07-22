import { NewWorkflowPage } from "@/modules/workflows/presentation/pages/NewWorkflowPage";
import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";

export default async function Page() {
  const user = await requireAuthenticatedPageUser("/workflows/new");
  return <NewWorkflowPage userName={user.name} logoutControl={<LogoutButton />} />;
}
