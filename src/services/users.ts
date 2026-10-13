import type { TypedSupabaseClient } from "@/lib/supabase/client";
import type { UserProfile, UserProfileUpdate } from "@/types/entities";

/**
 * Serviço de perfis de usuário (tabela `public.users`).
 * Recebe o cliente Supabase por injeção para funcionar no browser e no servidor.
 */
export function createUsersService(supabase: TypedSupabaseClient) {
  return {
    async getProfileById(userId: string): Promise<UserProfile | null> {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("[users] getProfileById", error.message);
        return null;
      }
      return data;
    },

    async updateProfile(userId: string, changes: UserProfileUpdate): Promise<UserProfile | null> {
      const { data, error } = await supabase
        .from("users")
        .update(changes)
        .eq("id", userId)
        .select("*")
        .single();

      if (error) {
        console.error("[users] updateProfile", error.message);
        return null;
      }
      return data;
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
