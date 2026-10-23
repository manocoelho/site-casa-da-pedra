import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TypedSupabaseClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

/**
 * Cria um cliente Supabase administrativo (Service Role) para uso exclusivo no servidor
 * (Webhooks de pagamento, verificação automática de expiração de Pix, etc.).
 * Ignora RLS para poder confirmar ou expirar reservas em segundo plano.
 */
export function createSupabaseAdminClient(): TypedSupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Variável SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.",
    );
  }

  return createClient<Database>(env.supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
