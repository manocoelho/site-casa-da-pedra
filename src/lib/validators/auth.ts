import type {
  FieldErrors,
  LoginCredentials,
  SignUpFormValues,
} from "@/types/auth";

/** Regras de validação dos formulários de autenticação (funções puras, sem React). */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function validateLogin(values: LoginCredentials): FieldErrors<LoginCredentials> {
  const errors: FieldErrors<LoginCredentials> = {};

  if (!values.email.trim()) errors.email = "Informe seu e-mail.";
  else if (!EMAIL_REGEX.test(values.email.trim())) errors.email = "E-mail inválido.";

  if (!values.senha) errors.senha = "Informe sua senha.";

  return errors;
}

export function validateSignUp(values: SignUpFormValues): FieldErrors<SignUpFormValues> {
  const errors: FieldErrors<SignUpFormValues> = {};

  if (values.nome.trim().length < 2) errors.nome = "Informe seu nome completo.";

  if (!values.email.trim()) errors.email = "Informe seu e-mail.";
  else if (!EMAIL_REGEX.test(values.email.trim())) errors.email = "E-mail inválido.";

  if (values.senha.length < MIN_PASSWORD_LENGTH) {
    errors.senha = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  } else if (!/[A-Za-z]/.test(values.senha) || !/\d/.test(values.senha)) {
    errors.senha = "A senha deve conter letras e números.";
  }

  if (values.confirmarSenha !== values.senha) {
    errors.confirmarSenha = "As senhas não coincidem.";
  }

  return errors;
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}
