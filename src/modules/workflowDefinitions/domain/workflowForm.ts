export const WORKFLOW_FORM_FIELD_TYPES = [
  "text", "textarea", "number", "currency", "boolean", "date", "datetime", "select", "multiselect",
] as const;

export type WorkflowFormFieldType = (typeof WORKFLOW_FORM_FIELD_TYPES)[number];
export type WorkflowFormScalar = string | number | boolean;
export type WorkflowFormValue = WorkflowFormScalar | ReadonlyArray<string> | null;

export type WorkflowFormOption = Readonly<{
  id: string;
  value: string;
  label: string;
  order: number;
}>;

export type WorkflowFormField = Readonly<{
  id: string;
  key: string;
  label: string;
  description?: string;
  type: WorkflowFormFieldType;
  required: boolean;
  order: number;
  defaultValue?: WorkflowFormValue;
  options: ReadonlyArray<WorkflowFormOption>;
}>;

export class WorkflowFormError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowFormError";
  }
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string) {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function normalizeDatetime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0", milliseconds = "0", zone] = match;
  if (!validDate(`${year}-${month}-${day}`) || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
  if (zone && zone !== "Z") {
    const [zoneHour, zoneMinute] = zone.slice(1).split(":").map(Number);
    if (zoneHour > 14 || zoneMinute > 59) return null;
  }
  const canonical = `${year}-${month}-${day}T${hour}:${minute}:${second}.${milliseconds.padEnd(3, "0")}${zone ?? "Z"}`;
  const parsed = new Date(canonical);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeCurrency(raw: unknown, label: string) {
  if (typeof raw !== "string") throw new WorkflowFormError(`O campo ${label} deve ser um valor monetário decimal.`);
  const match = /^([+-]?)(\d+)(?:[.,](\d{1,2}))?$/.exec(raw.trim());
  if (!match) throw new WorkflowFormError(`O campo ${label} deve ser um valor monetário decimal.`);
  const integer = match[2].replace(/^0+(?=\d)/, "");
  const fraction = (match[3] ?? "").padEnd(2, "0");
  const sign = match[1] === "-" && (integer !== "0" || fraction !== "00") ? "-" : "";
  return `${sign}${integer}.${fraction}`;
}

export class WorkflowFormService {
  validate(fields: ReadonlyArray<WorkflowFormField>) {
    const ids = new Set<string>();
    const keys = new Set<string>();
    const orders = new Set<number>();
    for (const field of fields) {
      const key = field.key.trim();
      if (!field.id.trim() || !key || !/^[a-z][a-z0-9_]*$/i.test(key)) throw new WorkflowFormError("A chave do campo é inválida.");
      if (ids.has(field.id)) throw new WorkflowFormError("Os identificadores dos campos devem ser únicos.");
      ids.add(field.id);
      if (keys.has(key)) throw new WorkflowFormError("As chaves dos campos devem ser únicas.");
      keys.add(key);
      if (!field.label.trim()) throw new WorkflowFormError("O rótulo do campo é obrigatório.");
      if (!WORKFLOW_FORM_FIELD_TYPES.includes(field.type)) throw new WorkflowFormError("O tipo do campo é inválido.");
      if (!Number.isInteger(field.order) || field.order < 1 || orders.has(field.order)) throw new WorkflowFormError("A ordem dos campos é inválida.");
      orders.add(field.order);
      this.validateOptions(field);
      if (field.defaultValue !== undefined) this.normalizeValue(field, field.defaultValue, false);
      if (field.required && field.defaultValue === null) throw new WorkflowFormError("Campo obrigatório não pode possuir valor padrão nulo.");
    }
    const sortedOrders = [...orders].sort((a, b) => a - b);
    if (sortedOrders.some((order, index) => order !== index + 1)) throw new WorkflowFormError("A ordem dos campos deve ser sequencial.");
  }

  normalizeFields(fields: ReadonlyArray<WorkflowFormField>): ReadonlyArray<WorkflowFormField> {
    this.validate(fields);
    return fields.map((field) => ({
      ...field,
      defaultValue: field.defaultValue === undefined ? undefined : this.normalizeValue(field, field.defaultValue, field.required),
    }));
  }

  normalizeValues(
    fields: ReadonlyArray<WorkflowFormField>,
    input: Readonly<Record<string, unknown>>,
    requireAll = false,
  ): Readonly<Record<string, WorkflowFormValue>> {
    const byKey = new Map(fields.map((field) => [field.key, field]));
    for (const key of Object.keys(input)) if (!byKey.has(key)) throw new WorkflowFormError(`Campo desconhecido: ${key}.`);
    const normalized: Record<string, WorkflowFormValue> = {};
    for (const field of fields) {
      if (!(field.key in input)) {
        if (requireAll && field.required) throw new WorkflowFormError(`O campo ${field.label} é obrigatório.`);
        continue;
      }
      normalized[field.key] = this.normalizeValue(field, input[field.key], field.required);
    }
    return normalized;
  }

  private validateOptions(field: WorkflowFormField) {
    const selectable = field.type === "select" || field.type === "multiselect";
    if (selectable && field.options.length === 0) throw new WorkflowFormError("Campos de seleção precisam possuir opções.");
    if (!selectable && field.options.length > 0) throw new WorkflowFormError("Somente campos de seleção podem possuir opções.");
    const values = new Set<string>();
    const ids = new Set<string>();
    const orders = new Set<number>();
    for (const option of field.options) {
      if (!option.id.trim() || !option.value.trim() || !option.label.trim()) throw new WorkflowFormError("A opção do campo é inválida.");
      if (ids.has(option.id) || values.has(option.value) || orders.has(option.order) || !Number.isInteger(option.order) || option.order < 1) {
        throw new WorkflowFormError("As opções devem possuir valores e ordens únicas.");
      }
      ids.add(option.id);
      values.add(option.value);
      orders.add(option.order);
    }
    if ([...orders].sort((a, b) => a - b).some((order, index) => order !== index + 1)) {
      throw new WorkflowFormError("A ordem das opções deve ser sequencial.");
    }
  }

  private normalizeValue(field: WorkflowFormField, raw: unknown, required: boolean): WorkflowFormValue {
    if (raw === null || raw === undefined || raw === "") {
      if (required) throw new WorkflowFormError(`O campo ${field.label} é obrigatório.`);
      return null;
    }
    if (field.type === "text" || field.type === "textarea") {
      if (typeof raw !== "string") throw new WorkflowFormError(`O campo ${field.label} deve ser textual.`);
      return raw;
    }
    if (field.type === "currency") return normalizeCurrency(raw, field.label);
    if (field.type === "number") {
      const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.replace(",", ".")) : Number.NaN;
      if (!Number.isFinite(value)) throw new WorkflowFormError(`O campo ${field.label} deve ser numérico.`);
      return value;
    }
    if (field.type === "boolean") {
      if (typeof raw === "boolean") return raw;
      if (raw === "true" || raw === "false") return raw === "true";
      throw new WorkflowFormError(`O campo ${field.label} deve ser booleano.`);
    }
    if (field.type === "date") {
      if (typeof raw !== "string" || !validDate(raw)) throw new WorkflowFormError(`O campo ${field.label} deve ser uma data válida.`);
      return raw;
    }
    if (field.type === "datetime") {
      if (typeof raw !== "string") throw new WorkflowFormError(`O campo ${field.label} deve ser uma data e hora válida.`);
      const normalized = normalizeDatetime(raw);
      if (!normalized) throw new WorkflowFormError(`O campo ${field.label} deve ser uma data e hora válida.`);
      return normalized;
    }
    const allowed = new Set(field.options.map((option) => option.value));
    if (field.type === "select") {
      if (typeof raw !== "string" || !allowed.has(raw)) throw new WorkflowFormError(`A opção de ${field.label} é inválida.`);
      return raw;
    }
    if (!Array.isArray(raw) || (required && raw.length === 0) || raw.some((value) => typeof value !== "string" || !allowed.has(value))) {
      throw new WorkflowFormError(`As opções de ${field.label} são inválidas.`);
    }
    return [...new Set(raw as string[])];
  }
}
