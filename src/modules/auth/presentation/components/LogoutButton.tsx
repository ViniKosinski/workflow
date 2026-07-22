"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
      setBusy(false);
    }
  }
  return <button type="button" onClick={logout} disabled={busy} className="text-sm font-semibold text-slate-600 hover:text-slate-950">{busy ? "Saindo..." : "Sair"}</button>;
}
