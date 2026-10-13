"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserAuthService } from "@/services/auth";
import { createUsersService } from "@/services/users";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import type { AuthUser } from "@/types/auth";
import type { UserProfile } from "@/types/entities";

interface AuthUserState {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

/**
 * Sessão atual no cliente: usuário do Auth + perfil de `public.users`.
 * Mantém-se sincronizado com login/logout (inclusive em outras abas).
 */
export function useAuthUser() {
  const router = useRouter();
  const [state, setState] = useState<AuthUserState>({
    user: null,
    profile: null,
    isLoading: true,
  });

  useEffect(() => {
    const auth = getBrowserAuthService();
    const users = createUsersService(createSupabaseBrowserClient());
    let active = true;

    async function sync(user: AuthUser | null) {
      const profile = user ? await users.getProfileById(user.id) : null;
      if (active) setState({ user, profile, isLoading: false });
    }

    // O Supabase emite INITIAL_SESSION logo na inscrição, então isto também carrega o estado inicial.
    const unsubscribe = auth.onAuthStateChange((user) => {
      // Adia a consulta para fora do callback do Supabase (evita deadlock do lock de sessão).
      setTimeout(() => sync(user), 0);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const result = await getBrowserAuthService().signOut();
    if (result.ok) {
      router.replace(ROUTES.home);
      router.refresh();
    }
    return result;
  }, [router]);

  return {
    ...state,
    isAuthenticated: Boolean(state.user),
    isAdmin: state.profile?.role === "admin",
    signOut,
  };
}
