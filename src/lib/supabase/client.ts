import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Cliente Supabase para o browser (Client Components / hooks).
 * `createBrowserClient` já retorna um singleton no browser.
 */
export function createSupabaseBrowserClient(): TypedSupabaseClient {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}
