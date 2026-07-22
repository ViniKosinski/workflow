"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    if (password !== data.get("confirmation")) {
      setError("As senhas não coincidem.");
      setSubmitting(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email"), password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível solicitar a criação da conta.");
        return;
      }
      router.push("/login?registered=1");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return <form className="space-y-5" onSubmit={handleSubmit}>
    <label className="block text-sm font-semibold text-slate-700">Nome
      <input name="name" autoComplete="name" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
    </label>
    <label className="block text-sm font-semibold text-slate-700">E-mail
      <input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
    </label>
    <label className="block text-sm font-semibold text-slate-700">Senha
      <input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
      <span className="mt-1 block text-xs font-normal text-slate-500">Use pelo menos 12 caracteres.</span>
    </label>
    <label className="block text-sm font-semibold text-slate-700">Confirmar senha
      <input name="confirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
    </label>
    {error && <p aria-live="polite" className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Criando conta..." : "Criar conta"}</Button>
  </form>;
}
