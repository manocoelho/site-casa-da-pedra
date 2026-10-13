import type { AuthError } from "@supabase/supabase-js";
import {
  createSupabaseBrowserClient,
  type TypedSupabaseClient,
} from "@/lib/supabase/client";
import type {
  AuthResult,
  AuthUser,
  LoginCredentials,
  OAuthProvider,
  SignUpData,
  SignUpOutcome,
} from "@/types/auth";

/**
 * Serviço de autenticação.
 *
 * Único ponto da aplicação que conversa com o Supabase Auth.
 * - Recebe o cliente Supabase por injeção (browser ou servidor), sem depender de React.
 * - Nunca lança exceções para a camada de UI: sempre retorna `AuthResult`.
 * - Traduz os erros do Supabase para mensagens amigáveis em português.
 */
export function createAuthService(supabase: TypedSupabaseClient) {
  return {
    /** Login com e-mail e senha. */
    async signInWithEmail({ email, senha }: LoginCredentials): Promise<AuthResult<AuthUser>> {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password: senha,
      });
      if (error) return failure(error);
      return { ok: true, data: data.user };
    },

    /**
     * Cadastro com e-mail e senha.
     * O `nome` vai para `user_metadata` e é copiado para `public.users` pela trigger do banco.
     */
    async signUpWithEmail(
      { nome, email, senha }: SignUpData,
      options: { emailRedirectTo: string },
    ): Promise<AuthResult<SignUpOutcome>> {
      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password: senha,
        options: {
          emailRedirectTo: options.emailRedirectTo,
          data: { nome: nome.trim(), full_name: nome.trim() },
        },
      });
      if (error) return failure(error);

      // Com confirmação de e-mail ativa, o Supabase não retorna erro para e-mails
      // já cadastrados (proteção contra enumeração), mas devolve `identities` vazio.
      if (data.user && data.user.identities?.length === 0) {
        return { ok: false, error: AUTH_ERROR_MESSAGES.user_already_exists };
      }

      return { ok: true, data: { needsEmailConfirmation: !data.session } };
    },

    /** Inicia o fluxo OAuth (Google/Facebook). No browser, redireciona para o provedor. */
    async signInWithOAuth(
      provider: OAuthProvider,
      options: { redirectTo: string },
    ): Promise<AuthResult> {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: options.redirectTo,
          scopes: provider === "facebook" ? "email public_profile" : undefined,
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
        },
      });
      if (error) return failure(error);
      return { ok: true, data: undefined };
    },

    /** Troca o `code` (PKCE) do callback OAuth/confirmação de e-mail por uma sessão. */
    async exchangeCodeForSession(code: string): Promise<AuthResult> {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return failure(error);
      return { ok: true, data: undefined };
    },

    /** Encerra a sessão atual. */
    async signOut(): Promise<AuthResult> {
      const { error } = await supabase.auth.signOut();
      if (error) return failure(error);
      return { ok: true, data: undefined };
    },

    /** Usuário autenticado, validado junto ao servidor do Supabase Auth. */
    async getCurrentUser(): Promise<AuthUser | null> {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    },

    /**
     * Observa mudanças de sessão (login, logout, refresh de token).
     * Retorna a função para cancelar a inscrição.
     */
    onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

let browserAuthService: AuthService | null = null;

/** Instância do serviço para uso no browser (hooks / Client Components). */
export function getBrowserAuthService(): AuthService {
  browserAuthService ??= createAuthService(createSupabaseBrowserClient());
  return browserAuthService;
}

// -----------------------------------------------------------------------------
// Helpers internos
// -----------------------------------------------------------------------------

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com este e-mail.",
  email_exists: "Já existe uma conta com este e-mail.",
  weak_password: "Senha muito fraca. Use pelo menos 8 caracteres com letras e números.",
  email_address_invalid: "E-mail inválido.",
  signup_disabled: "Novos cadastros estão temporariamente desativados.",
  over_email_send_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  over_request_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  provider_disabled: "Este método de login não está habilitado.",
  oauth_provider_not_supported: "Este método de login não está habilitado.",
  flow_state_expired: "O link expirou. Tente novamente.",
  flow_state_not_found: "Sessão de login inválida. Tente novamente no mesmo navegador.",
  bad_code_verifier: "Sessão de login inválida. Tente novamente no mesmo navegador.",
  session_not_found: "Sua sessão expirou. Entre novamente.",
};

const DEFAULT_ERROR_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";

function failure(error: AuthError): { ok: false; error: string } {
  const message = (error.code && AUTH_ERROR_MESSAGES[error.code]) || DEFAULT_ERROR_MESSAGE;
  if (process.env.NODE_ENV !== "production") {
    console.error("[auth]", error.code ?? error.name, error.message);
  }
  return { ok: false, error: message };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
