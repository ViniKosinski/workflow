"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword !== data.get("confirmation")) {
      setError("As novas senhas não coincidem.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.message ?? "Não foi possível alterar a senha.");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-6">
    <h2 className="text-xl font-bold text-slate-950">Alterar senha</h2>
    <label className="block text-sm font-semibold text-slate-700">Senha atual<input name="currentPassword" type="password" autoComplete="current-password" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
    <label className="block text-sm font-semibold text-slate-700">Nova senha<input name="newPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
    <label className="block text-sm font-semibold text-slate-700">Confirmar nova senha<input name="confirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
    {error && <p aria-live="polite" className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <Button type="submit" disabled={busy}>{busy ? "Alterando..." : "Alterar senha"}</Button>
  </form>;
}
