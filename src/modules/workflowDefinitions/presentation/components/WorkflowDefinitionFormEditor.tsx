"use client";

import { type FormEvent, useState } from "react";
import type { WorkflowFormField, WorkflowFormFieldType } from "@/modules/workflowDefinitions/domain/workflowForm";

export function WorkflowDefinitionFormEditor({ definitionId, initialFields }: Readonly<{
  definitionId: string;
  initialFields: ReadonlyArray<WorkflowFormField>;
}>) {
  const [fields, setFields] = useState(initialFields);
  const [editing, setEditing] = useState<WorkflowFormField | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const type = String(data.get("type")) as WorkflowFormFieldType;
    const options = String(data.get("options") ?? "").split(",").map((item) => item.trim()).filter(Boolean).map((item, index) => {
      const [value, label = value] = item.split(":").map((part) => part.trim());
      return { value, label, order: index + 1 };
    });
    const rawDefault = data.get("defaultValue");
    const defaultValue = rawDefault === "" || rawDefault === null ? undefined
      : type === "boolean" ? rawDefault === "true"
        : type === "number" ? Number(rawDefault)
          : type === "multiselect" ? String(rawDefault).split(",").map((item) => item.trim()).filter(Boolean)
            : rawDefault;
    const payload = {
      key: String(data.get("key")),
      label: String(data.get("label")),
      description: String(data.get("description") ?? ""),
      type,
      required: data.get("required") === "on",
      order: editing?.order ?? fields.length + 1,
      defaultValue,
      options: type === "select" || type === "multiselect" ? options : [],
    };
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/workflow-definitions/${definitionId}/form/fields${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setFields(body.fields);
      setEditing(null);
      formElement.reset();
      setMessage("Formulário atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o formulário.");
    } finally { setBusy(false); }
  }

  async function remove(fieldId: string) {
    setBusy(true);
    const response = await fetch(`/api/workflow-definitions/${definitionId}/form/fields/${fieldId}`, { method: "DELETE" });
    if (response.ok) setFields((current) => current.filter((field) => field.id !== fieldId).map((field, index) => ({ ...field, order: index + 1 })));
    else setMessage((await response.json()).message);
    setBusy(false);
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const reordered = [...fields];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const response = await fetch(`/api/workflow-definitions/${definitionId}/form/reorder`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fieldIds: reordered.map((field) => field.id) }),
    });
    const body = await response.json();
    if (response.ok) setFields(body.fields); else setMessage(body.message);
  }

  return <section className="space-y-4 border-t pt-6">
    <div><h2 className="text-xl font-bold">Formulário</h2><p className="text-sm text-slate-600">Campos copiados para cada execução.</p></div>
    <ol className="space-y-2">{fields.map((field, index) => <li className="flex items-center justify-between border bg-white p-3" key={field.id}>
      <div><p className="font-semibold">{field.order}. {field.label} <span className="text-xs text-slate-500">({field.key} · {field.type})</span></p>{field.required ? <p className="text-xs text-rose-600">Obrigatório</p> : null}</div>
      <div className="flex gap-2">
        <button disabled={busy || index === 0} onClick={() => move(index, -1)} type="button">↑</button>
        <button disabled={busy || index === fields.length - 1} onClick={() => move(index, 1)} type="button">↓</button>
        <button disabled={busy} onClick={() => setEditing(field)} type="button">Editar</button>
        <button className="text-rose-700" disabled={busy} onClick={() => remove(field.id)} type="button">Remover</button>
      </div>
    </li>)}</ol>
    <form className="grid gap-3 border bg-white p-4 md:grid-cols-2" key={editing?.id ?? "new"} onSubmit={submit}>
      <label className="text-sm font-medium">Chave<input className="mt-1 h-10 w-full border px-3" defaultValue={editing?.key} name="key" required /></label>
      <label className="text-sm font-medium">Rótulo<input className="mt-1 h-10 w-full border px-3" defaultValue={editing?.label} name="label" required /></label>
      <label className="text-sm font-medium">Tipo<select className="mt-1 h-10 w-full border px-3" defaultValue={editing?.type ?? "text"} name="type">{["text","textarea","number","currency","boolean","date","datetime","select","multiselect"].map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="text-sm font-medium">Valor padrão<input className="mt-1 h-10 w-full border px-3" defaultValue={editing?.defaultValue === undefined ? "" : String(editing.defaultValue)} name="defaultValue" /></label>
      <label className="text-sm font-medium md:col-span-2">Descrição<input className="mt-1 h-10 w-full border px-3" defaultValue={editing?.description} name="description" /></label>
      <label className="text-sm font-medium md:col-span-2">Opções (valor:rótulo, separadas por vírgula)<input className="mt-1 h-10 w-full border px-3" defaultValue={editing?.options.map((option) => `${option.value}:${option.label}`).join(", ")} name="options" /></label>
      <label className="flex items-center gap-2 text-sm"><input defaultChecked={editing?.required} name="required" type="checkbox" />Obrigatório</label>
      <div className="flex justify-end gap-2"><button disabled={busy} type="submit">{editing ? "Salvar campo" : "Adicionar campo"}</button>{editing ? <button onClick={() => setEditing(null)} type="button">Cancelar</button> : null}</div>
    </form>
    {message ? <p aria-live="polite" className="text-sm">{message}</p> : null}
  </section>;
}
