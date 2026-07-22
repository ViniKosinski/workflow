import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { AuthShell } from "@/modules/auth/presentation/components/AuthShell";
import { LoginForm } from "@/modules/auth/presentation/components/LoginForm";

export default async function LoginPage({ searchParams }: Readonly<{ searchParams: Promise<{ next?: string; registered?: string }> }>) {
  if (await getOptionalAuthenticatedUser()) redirect("/");
  const query = await searchParams;
  const next = query.next?.startsWith("/") && !query.next.startsWith("//") ? query.next : "/";
  return <AuthShell title="Entrar" description="Acesse seus workflows com sua conta." footer={<>Ainda não tem conta? <Link className="font-semibold text-brand-700" href="/register">Criar conta</Link></>}><LoginForm next={next} registered={query.registered === "1"} /></AuthShell>;
}
