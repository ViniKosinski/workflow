"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { organizationClient } from "@/modules/organizations/presentation/api/organizationClient";
import { Button } from "@/shared/components/ui/Button";

export function NewOrganizationForm() {
  const router = useRouter(); const [name, setName] = useState(""); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try { const organization = await organizationClient.create(name); router.push(`/organizations/${organization.id}`); router.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível criar a organização."); } finally { setBusy(false); } }
  return <form className="max-w-2xl border border-slate-200 bg-white p-6" onSubmit={submit}><label className="text-sm font-semibold text-slate-700" htmlFor="organization-name">Nome da organização</label><input autoFocus className="mt-2 h-11 w-full border border-slate-300 px-3 text-sm" id="organization-name" maxLength={160} onChange={(event) => setName(event.target.value)} required value={name} />{error ? <p className="mt-3 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}<div className="mt-5 flex justify-end"><Button disabled={busy} type="submit">{busy ? "Criando..." : "Criar organização"}</Button></div></form>;
}
