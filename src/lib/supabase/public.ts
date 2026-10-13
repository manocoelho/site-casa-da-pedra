import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TypedSupabaseClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

/**
 * Cliente Supabase anônimo, SEM cookies/sessão.
 *
 * Use apenas para leituras públicas (liberadas a `anon` pelo RLS), como a vitrine
 * de flats. Por não depender da requisição, pode ser usado dentro de `"use cache"`.
 */
export function createSupabasePublicClient(): TypedSupabaseClient {
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
