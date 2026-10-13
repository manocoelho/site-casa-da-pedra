import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import type { TypedSupabaseClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

/**
 * Cliente Supabase para o servidor (Server Components, Server Actions, Route Handlers).
 * Crie um novo cliente por requisição — nunca compartilhe entre requisições.
 *
 * Com `cacheComponents` habilitado, componentes que chamam esta função leem
 * `cookies()` e, portanto, devem ficar dentro de um `<Suspense>`.
 */
export async function createSupabaseServerClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado a partir de um Server Component, onde não é possível gravar cookies.
          // Seguro ignorar: o proxy (src/proxy.ts) é responsável por renovar a sessão.
        }
      },
    },
  });
}
