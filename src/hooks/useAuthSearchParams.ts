"use client";

import { useSearchParams } from "next/navigation";
import { sanitizeRedirectPath } from "@/lib/routes";

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  oauth: "Não foi possível entrar com o provedor escolhido. Tente novamente.",
  callback: "O link de acesso é inválido ou expirou. Tente novamente.",
};

/**
 * Lê os parâmetros de URL das páginas de autenticação:
 * - `next`: destino após login/cadastro (sanitizado contra open redirect)
 * - `error`: código de erro vindo do callback OAuth
 *
 * Usa `useSearchParams`, portanto o componente consumidor deve estar dentro de `<Suspense>`.
 */
export function useAuthSearchParams() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");

  return {
    redirectTo: sanitizeRedirectPath(searchParams.get("next")),
    callbackError: errorCode
      ? (CALLBACK_ERROR_MESSAGES[errorCode] ?? CALLBACK_ERROR_MESSAGES.callback)
      : null,
  };
}
