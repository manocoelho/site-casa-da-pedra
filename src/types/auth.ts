import type { User } from "@supabase/supabase-js";

/** Provedores OAuth habilitados no projeto. */
export type OAuthProvider = "google" | "facebook";

/** Usuário autenticado (Supabase Auth). */
export type AuthUser = User;

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface SignUpData {
  nome: string;
  email: string;
  senha: string;
}

/** Campos do formulário de cadastro (inclui confirmação, que não vai ao backend). */
export interface SignUpFormValues extends SignUpData {
  confirmarSenha: string;
}

/**
 * Resultado padronizado das operações de autenticação.
 * Os serviços nunca lançam exceções para a UI: sempre retornam este formato.
 */
export type AuthResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface SignUpOutcome {
  /** `true` quando o Supabase exige confirmação de e-mail antes do primeiro login. */
  needsEmailConfirmation: boolean;
}

/** Mapa de erros de validação por campo. */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;
