export type Organization = Readonly<{
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}>;

export function validateOrganizationName(name: string) {
  const normalized = name.trim();
  if (!normalized || normalized.length > 160) {
    throw new OrganizationDomainError("O nome da organização deve ter entre 1 e 160 caracteres.");
  }
  return normalized;
}

export class OrganizationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationDomainError";
  }
}
