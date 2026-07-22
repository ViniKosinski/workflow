import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { AuthShell } from "@/modules/auth/presentation/components/AuthShell";
import { RegisterForm } from "@/modules/auth/presentation/components/RegisterForm";

export default async function RegisterPage() {
  if (await getOptionalAuthenticatedUser()) redirect("/");
  return <AuthShell title="Criar conta" description="Crie seu espaço pessoal para gerenciar workflows." footer={<>Já tem uma conta? <Link className="font-semibold text-brand-700" href="/login">Entrar</Link></>}><RegisterForm /></AuthShell>;
}
