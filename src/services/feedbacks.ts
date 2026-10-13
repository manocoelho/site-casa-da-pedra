import {
  createSupabaseBrowserClient,
  type TypedSupabaseClient,
} from "@/lib/supabase/client";
import type {
  CreateFeedbackInput,
  FeedbackOperationResult,
  FeedbackWithAuthor,
} from "@/types/feedbacks";

export interface FeedbackStats {
  averageRating: number;
  totalCount: number;
  distribution: Record<number, number>;
}

export function calculateFeedbackStats(feedbacks: FeedbackWithAuthor[]): FeedbackStats {
  const totalCount = feedbacks.length;
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (totalCount === 0) {
    return { averageRating: 5, totalCount: 0, distribution };
  }

  let sum = 0;
  for (const f of feedbacks) {
    sum += f.nota;
    if (f.nota >= 1 && f.nota <= 5) {
      distribution[f.nota] = (distribution[f.nota] || 0) + 1;
    }
  }

  const averageRating = Number((sum / totalCount).toFixed(1));

  return {
    averageRating,
    totalCount,
    distribution,
  };
}

interface RpcFeedbackRow {
  id: string;
  flat_id: string;
  user_id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
  autor_nome: string | null;
}

interface FallbackFeedbackRow {
  id: string;
  flat_id: string;
  user_id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
  users: { nome: string | null } | null;
}

export function createFeedbacksService(supabase: TypedSupabaseClient) {
  return {
    /**
     * Lista avaliações de um flat ordenadas pelas mais recentes.
     * Tenta utilizar a RPC 'get_flat_feedbacks' para trazer o nome do autor com segurança.
     */
    async listByFlat(flatId: string): Promise<FeedbackWithAuthor[]> {
      // 1. Tenta RPC segura
      try {
        type RpcCaller = (
          fn: string,
          args: { p_flat_id: string },
        ) => Promise<{ data: RpcFeedbackRow[] | null; error: unknown }>;

        const rpcCaller = supabase.rpc as unknown as RpcCaller;
        const { data: rpcData, error: rpcError } = await rpcCaller(
          "get_flat_feedbacks",
          { p_flat_id: flatId },
        );

        if (!rpcError && Array.isArray(rpcData)) {
          return rpcData.map((row) => ({
            id: row.id,
            flat_id: row.flat_id,
            user_id: row.user_id,
            nota: row.nota,
            comentario: row.comentario,
            created_at: row.created_at,
            autor_nome: row.autor_nome || "Hóspede",
          }));
        }
      } catch (err) {
        console.warn("[feedbacks] RPC get_flat_feedbacks indisponível, usando fallback:", err);
      }

      // 2. Fallback via tabela pública
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*, users(nome)")
        .eq("flat_id", flatId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[feedbacks] Falha ao carregar avaliações:", error.message);
        return [];
      }

      const rows = (data || []) as unknown as FallbackFeedbackRow[];
      return rows.map((row) => ({
        id: row.id,
        flat_id: row.flat_id,
        user_id: row.user_id,
        nota: row.nota,
        comentario: row.comentario,
        created_at: row.created_at,
        autor_nome: row.users?.nome || "Hóspede",
      }));
    },

    /**
     * Registra uma avaliação de 1 a 5 estrelas e comentário.
     */
    async createFeedback(
      input: CreateFeedbackInput,
    ): Promise<FeedbackOperationResult<FeedbackWithAuthor>> {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;

      if (userError || !user) {
        return {
          ok: false,
          error: "Você precisa estar conectado para avaliar este flat.",
        };
      }

      if (!input.nota || input.nota < 1 || input.nota > 5) {
        return {
          ok: false,
          error: "Selecione uma nota de 1 a 5 estrelas.",
        };
      }

      const comentario = input.comentario?.trim() || null;
      if (comentario && comentario.length > 2000) {
        return {
          ok: false,
          error: "O comentário não pode exceder 2000 caracteres.",
        };
      }

      const { data, error } = await supabase
        .from("feedbacks")
        .insert({
          flat_id: input.flatId,
          user_id: user.id,
          nota: input.nota,
          comentario,
        })
        .select("*, users(nome)")
        .single();

      if (error) {
        if (
          error.code === "23505" ||
          error.message?.includes("feedbacks_unico_por_usuario_flat")
        ) {
          return {
            ok: false,
            error: "Você já enviou uma avaliação para este flat.",
          };
        }

        if (error.message?.includes("policy") || error.code === "42501") {
          return {
            ok: false,
            error: "Avaliação permitida apenas para hóspedes com reserva.",
          };
        }

        return {
          ok: false,
          error: `Falha ao salvar avaliação: ${error.message}`,
        };
      }

      const authorName =
        (data as unknown as FallbackFeedbackRow)?.users?.nome ||
        user.user_metadata?.nome ||
        user.email?.split("@")[0] ||
        "Hóspede";

      return {
        ok: true,
        data: {
          id: data.id,
          flat_id: data.flat_id,
          user_id: data.user_id,
          nota: data.nota,
          comentario: data.comentario,
          created_at: data.created_at,
          autor_nome: authorName,
        },
      };
    },
  };
}

export type FeedbacksService = ReturnType<typeof createFeedbacksService>;

let browserFeedbacksService: FeedbacksService | null = null;

export function getBrowserFeedbacksService(): FeedbacksService {
  browserFeedbacksService ??= createFeedbacksService(createSupabaseBrowserClient());
  return browserFeedbacksService;
}
