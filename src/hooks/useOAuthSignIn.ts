"use client";

import { useState } from "react";
import { getBrowserAuthService } from "@/services/auth";
import { buildAuthCallbackUrl } from "@/lib/site-url";
import type { OAuthProvider } from "@/types/auth";

/**
 * Lógica de login social (Google / Facebook).
 * Em caso de sucesso o browser é redirecionado ao provedor, então o estado
 * de "carregando" permanece até a navegação.
 */
export function useOAuthSignIn(redirectTo: string) {
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: OAuthProvider) {
    setError(null);
    setPendingProvider(provider);

    const result = await getBrowserAuthService().signInWithOAuth(provider, {
      redirectTo: buildAuthCallbackUrl(redirectTo),
    });

    if (!result.ok) {
      setError(result.error);
      setPendingProvider(null);
    }
  }

  return { signIn, pendingProvider, error };
}
