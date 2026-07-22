"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";

export function LoginForm({ next = "/", registered = false }: Readonly<{ next?: string; registered?: boolean }>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível entrar.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return <form className="space-y-5" onSubmit={handleSubmit}>
    <label className="block text-sm font-semibold text-slate-700">E-mail
      <input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
    </label>
    <label className="block text-sm font-semibold text-slate-700">Senha
      <input name="password" type="password" autoComplete="current-password" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
    </label>
    {registered && <p aria-live="polite" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">Solicitação recebida. Se a conta foi criada, você já pode entrar.</p>}
    {error && <p aria-live="polite" className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Entrando..." : "Entrar"}</Button>
  </form>;
}
