import { describe, expect, it } from "vitest";
import { WorkflowFormError, WorkflowFormService, type WorkflowFormField } from "@/modules/workflowDefinitions/domain/workflowForm";

const service = new WorkflowFormService();
const field = (overrides: Partial<WorkflowFormField> = {}): WorkflowFormField => ({
  id: "field-1", key: "customer_name", label: "Cliente", type: "text", required: true, order: 1, options: [], ...overrides,
});

describe("WorkflowFormService", () => {
  it("valida formulário completo", () => expect(() => service.validate([
    field(),
    field({ id: "field-2", key: "priority", label: "Prioridade", type: "select", required: false, order: 2, options: [
      { id: "option-1", value: "high", label: "Alta", order: 1 },
    ] }),
  ])).not.toThrow());
  it("rejeita keys duplicadas", () => expect(() => service.validate([field(), field({ id: "field-2", order: 2 })])).toThrow(WorkflowFormError));
  it("rejeita ordem não sequencial", () => expect(() => service.validate([field({ order: 2 })])).toThrow(WorkflowFormError));
  it("exige opções para select", () => expect(() => service.validate([field({ type: "select" })])).toThrow(WorkflowFormError));
  it("rejeita default incompatível", () => expect(() => service.validate([field({ type: "number", defaultValue: "abc" })])).toThrow(WorkflowFormError));
  it("normaliza números, booleanos e datetime", () => {
    const fields = [
      field({ id: "n", key: "amount", label: "Valor", type: "currency" }),
      field({ id: "b", key: "active", label: "Ativo", type: "boolean", required: false, order: 2 }),
      field({ id: "d", key: "when", label: "Quando", type: "datetime", required: false, order: 3 }),
    ];
    expect(service.normalizeValues(fields, { amount: "12,50", active: "true", when: "2026-07-29T10:00:00-03:00" })).toEqual({
      amount: "12.50", active: true, when: "2026-07-29T13:00:00.000Z",
    });
  });
  it("valida opções de select e multiselect", () => {
    const options = [{ id: "one", value: "one", label: "Um", order: 1 }];
    expect(service.normalizeValues([
      field({ type: "select", options }),
      field({ id: "multi", key: "many", label: "Muitos", type: "multiselect", required: false, order: 2, options }),
    ], { customer_name: "one", many: ["one", "one"] })).toEqual({ customer_name: "one", many: ["one"] });
    expect(() => service.normalizeValues([field({ type: "select", options })], { customer_name: "invalid" })).toThrow(WorkflowFormError);
  });
  it("exige campos obrigatórios quando solicitado", () => expect(() => service.normalizeValues([field()], {}, true)).toThrow(WorkflowFormError));
  it("rejeita multiselect obrigatório vazio", () => {
    const options = [{ id: "one", value: "one", label: "Um", order: 1 }];
    expect(() => service.normalizeValues([
      field({ type: "multiselect", options }),
    ], { customer_name: [] }, true)).toThrow(WorkflowFormError);
  });
  it.each(["2026-02-30", "2026-11-31"])("rejeita data de calendário inexistente %s", (value) => {
    expect(() => service.normalizeValues([field({ type: "date" })], { customer_name: value })).toThrow(WorkflowFormError);
  });
  it("rejeita datetime com calendário ou horário inválido", () => {
    expect(() => service.normalizeValues([field({ type: "datetime" })], { customer_name: "2026-02-30T10:00" })).toThrow(WorkflowFormError);
    expect(() => service.normalizeValues([field({ type: "datetime" })], { customer_name: "2026-11-30T25:00" })).toThrow(WorkflowFormError);
  });
  it("preserva precisão monetária como decimal canônico", () => {
    expect(service.normalizeValues([field({ type: "currency" })], { customer_name: "9007199254740993,10" }))
      .toEqual({ customer_name: "9007199254740993.10" });
    expect(() => service.normalizeValues([field({ type: "currency" })], { customer_name: 0.1 + 0.2 })).toThrow(WorkflowFormError);
  });
});
