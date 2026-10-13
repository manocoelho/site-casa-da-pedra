import {
  createSupabaseBrowserClient,
  type TypedSupabaseClient,
} from "@/lib/supabase/client";
import type { Reservation, ReservationStatus } from "@/types/entities";
import type {
  AdminReservation,
  CreateReservationInput,
  OccupiedDateRange,
  ReservationOperationResult,
} from "@/types/reservations";

/**
 * Cria o serviço de reservas conectado ao Supabase.
 * Funciona no cliente e no servidor por injeção do cliente.
 */
export function createReservationsService(supabase: TypedSupabaseClient) {
  return {
    /**
     * Busca os períodos em que o flat já está reservado.
     * Tenta a RPC 'get_flat_occupied_ranges' e realiza fallback caso não exista.
     */
    async getOccupiedRanges(flatId: string): Promise<OccupiedDateRange[]> {
      const today = new Date().toISOString().split("T")[0];

      // 1. Tenta via RPC segura (SECURITY DEFINER)
      try {
        type RpcCaller = (
          fn: string,
          args: { p_flat_id: string },
        ) => Promise<{ data: OccupiedDateRange[] | null; error: unknown }>;

        const rpcCaller = supabase.rpc as unknown as RpcCaller;
        const { data: rpcData, error: rpcError } = await rpcCaller(
          "get_flat_occupied_ranges",
          { p_flat_id: flatId },
        );

        if (!rpcError && Array.isArray(rpcData)) {
          return rpcData.map((row) => ({
            data_inicio: String(row.data_inicio),
            data_fim: String(row.data_fim),
          }));
        }
      } catch (err) {
        console.warn("[reservations] RPC get_flat_occupied_ranges indisponível, usando fallback:", err);
      }

      // 2. Fallback de consulta direta à tabela
      const { data, error } = await supabase
        .from("reservations")
        .select("data_inicio, data_fim")
        .eq("flat_id", flatId)
        .in("status", ["pendente", "confirmada"])
        .gte("data_fim", today);

      if (error) {
        console.error("[reservations] Falha ao consultar disponibilidade:", error.message);
        return [];
      }

      return (data || []).map((row) => ({
        data_inicio: row.data_inicio,
        data_fim: row.data_fim,
      }));
    },

    /**
     * Cria uma nova solicitação de reserva para o usuário logado.
     */
    async createReservation(
      input: CreateReservationInput,
    ): Promise<ReservationOperationResult<Reservation>> {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;

      if (userError || !user) {
        return {
          ok: false,
          error: "Você precisa estar conectado para realizar uma reserva.",
        };
      }

      if (!input.dataInicio || !input.dataFim) {
        return {
          ok: false,
          error: "Informe as datas de check-in e check-out.",
        };
      }

      if (input.dataFim <= input.dataInicio) {
        return {
          ok: false,
          error: "A data de check-out deve ser posterior ao check-in.",
        };
      }

      const today = new Date().toISOString().split("T")[0];
      if (input.dataInicio < today) {
        return {
          ok: false,
          error: "A data de check-in não pode ser no passado.",
        };
      }

      const { data, error } = await supabase
        .from("reservations")
        .insert({
          user_id: user.id,
          flat_id: input.flatId,
          data_inicio: input.dataInicio,
          data_fim: input.dataFim,
          status: "pendente",
        })
        .select("*")
        .single();

      if (error) {
        // Violação da constraint de sobreposição de datas
        if (
          error.code === "23P01" ||
          error.message?.includes("reservations_sem_sobreposicao") ||
          error.details?.includes("conflicting key value")
        ) {
          return {
            ok: false,
            error: "O período selecionado já está reservado por outro hóspede. Escolha outras datas.",
          };
        }

        return {
          ok: false,
          error: `Falha ao registrar reserva: ${error.message}`,
        };
      }

      return {
        ok: true,
        data,
      };
    },

    /**
     * Lista as reservas feitas pelo usuário logado.
     */
    async listMyReservations(): Promise<Reservation[]> {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return [];

      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("data_inicio", { ascending: false });

      if (error) {
        console.error("[reservations] listMyReservations error:", error.message);
        return [];
      }

      return data || [];
    },

    /**
     * Cancela uma reserva existente do próprio usuário.
     */
    async cancelReservation(reservationId: string): Promise<ReservationOperationResult<Reservation>> {
      const { data, error } = await supabase
        .from("reservations")
        .update({ status: "cancelada" })
        .eq("id", reservationId)
        .select("*")
        .single();

      if (error) {
        return {
          ok: false,
          error: `Falha ao cancelar reserva: ${error.message}`,
        };
      }

      return {
        ok: true,
        data,
      };
    },

    /**
     * Lista todas as reservas para o painel administrativo.
     */
    async listAllReservations(
      filterStatus?: ReservationStatus,
    ): Promise<AdminReservation[]> {
      let query = supabase
        .from("reservations")
        .select("*, flats(id, titulo, preco_diaria), users(id, nome, email)")
        .order("created_at", { ascending: false });

      if (filterStatus) {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[reservations] listAllReservations error:", error.message);
        return [];
      }

      return (data as unknown as AdminReservation[]) || [];
    },

    /**
     * Atualiza o status de uma reserva (ex.: 'confirmada', 'concluida', 'cancelada').
     */
    async updateReservationStatus(
      reservationId: string,
      status: ReservationStatus,
    ): Promise<ReservationOperationResult<Reservation>> {
      const { data, error } = await supabase
        .from("reservations")
        .update({ status })
        .eq("id", reservationId)
        .select("*")
        .single();

      if (error) {
        return {
          ok: false,
          error: `Falha ao atualizar reserva: ${error.message}`,
        };
      }

      return {
        ok: true,
        data,
      };
    },
  };
}

export type ReservationsService = ReturnType<typeof createReservationsService>;

let browserReservationsService: ReservationsService | null = null;

export function getBrowserReservationsService(): ReservationsService {
  browserReservationsService ??= createReservationsService(createSupabaseBrowserClient());
  return browserReservationsService;
}
