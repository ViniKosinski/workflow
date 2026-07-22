import { AuthValidationError } from "@/modules/auth/application/authErrors";
import { normalizeEmail } from "@/modules/auth/domain/user";

export function validateEmail(value: string) {
  const email = normalizeEmail(value);
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthValidationError("Informe um e-mail válido.");
  }
  return email;
}

export function validateName(value: string) {
  const name = value.trim();
  if (name.length < 2 || name.length > 160) {
    throw new AuthValidationError("O nome deve ter entre 2 e 160 caracteres.");
  }
  return name;
}

export function validatePassword(value: string) {
  if (value.length < 12) {
    throw new AuthValidationError("A senha deve ter pelo menos 12 caracteres.");
  }
  if (value.length > 128) {
    throw new AuthValidationError("A senha deve ter no máximo 128 caracteres.");
  }
  return value;
}
