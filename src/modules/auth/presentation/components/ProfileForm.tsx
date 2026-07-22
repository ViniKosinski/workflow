"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";

export function ProfileForm({ name, email }: Readonly<{ name: string; email: string }>) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name") }) });
      const payload = await response.json().catch(() => ({}));
      setMessage(response.ok ? "Perfil atualizado." : payload.message ?? "Não foi possível atualizar.");
      if (response.ok) router.refresh();
    } catch {
      setMessage("Não foi possível conectar ao servidor.");
    }
  }
  return <form onSubmit={submit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6">
    <label className="block text-sm font-semibold text-slate-700">Nome
      <input name="name" defaultValue={name} required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" />
    </label>
    <label className="block text-sm font-semibold text-slate-700">E-mail
      <input value={email} disabled className="mt-2 w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 font-normal text-slate-500" />
    </label>
    {message && <p aria-live="polite" className="text-sm text-slate-600">{message}</p>}
    <Button type="submit">Salvar perfil</Button>
  </form>;
}
