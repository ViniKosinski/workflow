import Link from "next/link";
import { Button } from "@/shared/components/ui/Button";

export function OrganizationActions() {
  return <Link href="/organizations/new"><Button>Nova organização</Button></Link>;
}
