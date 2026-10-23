import {
  createSupabaseBrowserClient,
  type TypedSupabaseClient,
} from "@/lib/supabase/client";
import type { Reservation, ReservationStatus } from "@/types/entities";
import type {
  AdminReservation,
  ClientReservation,
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
      const combined: OccupiedDateRange[] = [];

      // 1. Consulta bloqueios externos sincronizados (Airbnb / Booking.com)
      try {
        const untyped = supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (col: string, val: string) => {
                gte: (
                  col2: string,
                  val2: string,
                ) => Promise<{ data: OccupiedDateRange[] | null; error: unknown }>;
              };
            };
          };
        };
        const { data: extData, error: extErr } = await untyped
          .from("external_calendar_blocks")
          .select("data_inicio, data_fim")
          .eq("flat_id", flatId)
          .gte("data_fim", today);

        if (!extErr && Array.isArray(extData)) {
          for (const row of extData) {
            combined.push({
              data_inicio: String(row.data_inicio),
              data_fim: String(row.data_fim),
            });
          }
        }
      } catch {
        // Ignora caso a tabela ainda não exista
      }

      // 2. Tenta via RPC segura (SECURITY DEFINER)
      try {
        type RpcClient = {
          rpc: (
            fn: string,
            args: { p_flat_id: string },
          ) => Promise<{ data: OccupiedDateRange[] | null; error: unknown }>;
        };

        const { data: rpcData, error: rpcError } = await (
          supabase as unknown as RpcClient
        ).rpc("get_flat_occupied_ranges", { p_flat_id: flatId });

        if (!rpcError && Array.isArray(rpcData)) {
          for (const row of rpcData) {
            combined.push({
              data_inicio: String(row.data_inicio),
              data_fim: String(row.data_fim),
            });
          }
          return combined;
        }
      } catch (err) {
        console.warn("[reservations] RPC get_flat_occupied_ranges indisponível, usando fallback:", err);
      }

      // 3. Fallback de consulta direta à tabela reservations
      const { data, error } = await supabase
        .from("reservations")
        .select("data_inicio, data_fim")
        .eq("flat_id", flatId)
        .in("status", ["pendente", "confirmada"])
        .gte("data_fim", today);

      if (error) {
        console.error("[reservations] Falha ao consultar disponibilidade:", error.message);
        return combined;
      }

      for (const row of data || []) {
        combined.push({
          data_inicio: row.data_inicio,
          data_fim: row.data_fim,
        });
      }

      return combined;
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

      // Verifica se há conflito com bloqueios externos (Airbnb / Booking.com)
      try {
        const occupied = await this.getOccupiedRanges(input.flatId);
        const hasOverlap = occupied.some(
          (r) => input.dataInicio < r.data_fim && input.dataFim > r.data_inicio,
        );
        if (hasOverlap) {
          return {
            ok: false,
            error:
              "O período selecionado já está reservado ou indisponível (sincronizado com Airbnb/Booking). Escolha outras datas.",
          };
        }
      } catch {
        // Continua para validação no banco
      }

      const baseInsertPayload = {
        user_id: user.id,
        flat_id: input.flatId,
        data_inicio: input.dataInicio,
        data_fim: input.dataFim,
        status: "pendente" as const,
      };

      const insertPayload =
        typeof input.valorTotal === "number" && Number.isFinite(input.valorTotal)
          ? { ...baseInsertPayload, valor_total: input.valorTotal }
          : baseInsertPayload;

      let { data, error } = await supabase
        .from("reservations")
        .insert(insertPayload)
        .select("*")
        .single();

      // Fallback automático caso a coluna valor_total ainda não tenha sido adicionada no Supabase
      if (
        error &&
        "valor_total" in insertPayload &&
        (error.message?.includes("valor_total") || error.code === "PGRST204")
      ) {
        const retry = await supabase
          .from("reservations")
          .insert(baseInsertPayload)
          .select("*")
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        // Violação da constraint de sobreposição de datas
        if (
          error.code === "23P01" ||
          error.message?.includes("reservations_sem_sobreposicao") ||
          error.details?.includes("conflicting key value")
        ) {
          return {
            ok: false,
            error:
              "O período selecionado já está reservado por outro hóspede ou sincronizado via Airbnb/Booking. Escolha outras datas.",
          };
        }

        return {
          ok: false,
          error: `Falha ao registrar reserva: ${error.message}`,
        };
      }

      return {
        ok: true,
        data: data ?? undefined,
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
     * Lista as reservas feitas pelo usuário logado, incluindo os dados e fotos do flat.
     */
    async listMyReservationsWithFlats(): Promise<ClientReservation[]> {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return [];

      // Expira reservas Pix pendentes vencidas (> 30 min) antes de listar
      try {
        await (supabase as unknown as { rpc: (fn: string) => Promise<unknown> }).rpc(
          "expire_unpaid_reservations",
        );
      } catch {
        // Ignora caso a função ainda não exista
      }

      const { data, error } = await supabase
        .from("reservations")
        .select(
          "*, flats(id, titulo, descricao, preco_diaria, max_hospedes, flat_photos(id, url_imagem))",
        )
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "[reservations] listMyReservationsWithFlats error:",
          error.message,
        );
        return [];
      }

      return (data as unknown as ClientReservation[]) || [];
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

    /**
     * Exclui um pedido de reserva no painel administrativo.
     * Caso o pedido ainda esteja pendente (não confirmado), marca-o automaticamente como recusado ('cancelada') antes de excluir.
     */
    async deleteReservation(
      reservationId: string,
      currentStatus?: ReservationStatus,
    ): Promise<ReservationOperationResult<null>> {
      if (currentStatus === "pendente") {
        await supabase
          .from("reservations")
          .update({ status: "cancelada" })
          .eq("id", reservationId);
      }

      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", reservationId);

      if (error) {
        return {
          ok: false,
          error: `Falha ao excluir pedido de reserva: ${error.message}`,
        };
      }

      return {
        ok: true,
        data: null,
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
