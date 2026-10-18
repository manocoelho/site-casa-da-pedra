import {
  createSupabaseBrowserClient,
  type TypedSupabaseClient,
} from "@/lib/supabase/client";
import type { DatePriceMap, FlatDatePrice } from "@/types/pricing";

interface UntypedPricingClient {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => Promise<{
          data: unknown[] | null;
          error: { message: string; code?: string } | null;
        }>;
      };
    };
    upsert: (
      records: unknown[],
      opts: { onConflict: string },
    ) => {
      select: (cols: string) => Promise<{
        data: unknown[] | null;
        error: { message: string; code?: string } | null;
      }>;
    };
    delete: () => {
      eq: (col: string, val: string) => {
        in: (
          col2: string,
          vals: string[],
        ) => Promise<{ error: { message: string; code?: string } | null }>;
      };
    };
  };
}

export function createPricingService(supabase: TypedSupabaseClient) {
  const client = supabase as unknown as UntypedPricingClient;

  return {
    /**
     * Lista todos os preços personalizados de um flat.
     */
    async listDatePrices(flatId: string): Promise<{
      prices: FlatDatePrice[];
      schemaMissing?: boolean;
    }> {
      try {
        const { data, error } = await client
          .from("flat_date_prices")
          .select("*")
          .eq("flat_id", flatId)
          .order("data", { ascending: true });

        if (error) {
          if (
            error.code === "42P01" ||
            error.message?.includes("flat_date_prices") ||
            error.message?.includes("does not exist")
          ) {
            return { prices: [], schemaMissing: true };
          }
          console.warn("[pricing] Erro ao listar preços por data:", error.message);
          return { prices: [] };
        }

        const parsed = ((data as FlatDatePrice[]) || []).map((row) => ({
          ...row,
          preco: Number(row.preco),
        }));

        return {
          prices: parsed,
          schemaMissing: false,
        };
      } catch (err) {
        console.warn("[pricing] Exceção ao listar preços por data:", err);
        return { prices: [] };
      }
    },

    /**
     * Retorna um mapa rápido ('YYYY-MM-DD' -> preço) para o flat informado.
     */
    async getDatePricesMap(flatId: string): Promise<DatePriceMap> {
      const { prices } = await this.listDatePrices(flatId);
      const map: DatePriceMap = {};
      for (const item of prices) {
        if (item.data && Number.isFinite(item.preco)) {
          map[item.data] = Number(item.preco);
        }
      }
      return map;
    },

    /**
     * Define ou atualiza o preço personalizado para uma ou várias datas de um flat.
     */
    async setDatesPrice(
      flatId: string,
      dates: string[],
      preco: number,
    ): Promise<{ ok: boolean; data?: FlatDatePrice[]; error?: string }> {
      if (!flatId || dates.length === 0) {
        return { ok: false, error: "Selecione pelo menos uma data no calendário." };
      }

      if (!Number.isFinite(preco) || preco <= 0) {
        return { ok: false, error: "Informe um valor de diária válido maior que zero." };
      }

      const uniqueDates = Array.from(new Set(dates));
      const payload = uniqueDates.map((data) => ({
        flat_id: flatId,
        data,
        preco,
      }));

      try {
        const { data, error } = await client
          .from("flat_date_prices")
          .upsert(payload, { onConflict: "flat_id,data" })
          .select("*");

        if (error) {
          if (
            error.code === "42P01" ||
            error.message?.includes("flat_date_prices") ||
            error.message?.includes("does not exist")
          ) {
            return {
              ok: false,
              error:
                "A tabela de preços por data ainda não foi criada no Supabase. Execute o script SQL indicado abaixo no SQL Editor do Supabase.",
            };
          }
          return {
            ok: false,
            error: `Falha ao salvar preço personalizado: ${error.message}`,
          };
        }

        const parsed = ((data as FlatDatePrice[]) || []).map((row) => ({
          ...row,
          preco: Number(row.preco),
        }));

        return { ok: true, data: parsed };
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "Erro inesperado ao salvar preços personalizados.",
        };
      }
    },

    /**
     * Remove o preço personalizado de uma ou mais datas (restaura o preço padrão do flat).
     */
    async removeDatesPrice(
      flatId: string,
      dates: string[],
    ): Promise<{ ok: boolean; error?: string }> {
      if (!flatId || dates.length === 0) {
        return { ok: false, error: "Nenhuma data selecionada." };
      }

      const uniqueDates = Array.from(new Set(dates));
      try {
        const { error } = await client
          .from("flat_date_prices")
          .delete()
          .eq("flat_id", flatId)
          .in("data", uniqueDates);

        if (error) {
          return {
            ok: false,
            error: `Não foi possível restaurar o preço padrão: ${error.message}`,
          };
        }

        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "Erro ao restaurar preço padrão.",
        };
      }
    },
  };
}

export type PricingService = ReturnType<typeof createPricingService>;

let browserPricingService: PricingService | null = null;

export function getBrowserPricingService(): PricingService {
  browserPricingService ??= createPricingService(createSupabaseBrowserClient());
  return browserPricingService;
}
