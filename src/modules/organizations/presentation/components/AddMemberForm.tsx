"use client";

import { FormEvent, useState } from "react";
import { organizationClient } from "@/modules/organizations/presentation/api/organizationClient";
import type { OrganizationRole } from "@/modules/organizations/presentation/types/organizationViewModels";
import { Button } from "@/shared/components/ui/Button";

export function AddMemberForm({ organizationId, roles, onChanged }: Readonly<{ organizationId: string; roles: ReadonlyArray<Exclude<OrganizationRole, "owner">>; onChanged: () => void }>) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<OrganizationRole, "owner">>(roles[0] ?? "viewer");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setStatus(null);
    try { await organizationClient.addMember(organizationId, email, role); setEmail(""); setStatus("Membro adicionado com sucesso."); onChanged(); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Não foi possível adicionar o membro."); }
    finally { setSubmitting(false); }
  }
  return <form className="border border-slate-200 bg-white p-5" onSubmit={submit}><h2 className="font-semibold text-slate-950">Adicionar membro</h2><div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]"><label className="sr-only" htmlFor="member-email">E-mail</label><input className="h-10 border border-slate-300 px-3 text-sm" id="member-email" onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplo.com" required type="email" value={email} /><label className="sr-only" htmlFor="member-role">Papel</label><select className="h-10 border border-slate-300 px-3 text-sm" id="member-role" onChange={(event) => setRole(event.target.value as Exclude<OrganizationRole, "owner">)} value={role}>{roles.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select><Button disabled={submitting} type="submit">{submitting ? "Adicionando..." : "Adicionar"}</Button></div>{status ? <p aria-live="polite" className="mt-3 text-sm text-slate-600">{status}</p> : null}</form>;
}
