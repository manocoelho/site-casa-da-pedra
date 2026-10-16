import {
  createSupabaseBrowserClient,
  type TypedSupabaseClient,
} from "@/lib/supabase/client";
import type {
  CreateIcalFeedInput,
  ExternalCalendarBlock,
  FlatIcalFeed,
  IcalSyncFeedResult,
} from "@/types/ical";

interface UntypedTableClient {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: unknown[] | null; error: { message: string; code?: string } | null }>;
        gte: (
          col: string,
          val: string,
        ) => {
          order: (
            col: string,
            opts: { ascending: boolean },
          ) => Promise<{ data: unknown[] | null; error: { message: string; code?: string } | null }>;
        };
      };
      gte: (
        col: string,
        val: string,
      ) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: unknown[] | null; error: { message: string; code?: string } | null }>;
      };
      order: (
        col: string,
        opts: { ascending: boolean },
      ) => Promise<{ data: unknown[] | null; error: { message: string; code?: string } | null }>;
    };
    insert: (record: unknown) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: unknown | null;
          error: { message: string; code?: string } | null;
        }>;
      };
    };
    delete: () => {
      eq: (
        col: string,
        val: string,
      ) => Promise<{ error: { message: string; code?: string } | null }>;
    };
  };
}

export function createIcalService(supabase: TypedSupabaseClient) {
  const client = supabase as unknown as UntypedTableClient;

  return {
    /**
     * Lista todos os feeds iCal cadastrados (opcionalmente filtrados por flatId).
     */
    async listFeeds(flatId?: string): Promise<{
      feeds: FlatIcalFeed[];
      schemaMissing?: boolean;
    }> {
      try {
        const base = client.from("flat_ical_feeds").select("*");
        const { data, error } = flatId
          ? await base.eq("flat_id", flatId).order("created_at", { ascending: true })
          : await base.order("created_at", { ascending: true });

        if (error) {
          if (
            error.code === "42P01" ||
            error.message?.includes("flat_ical_feeds") ||
            error.message?.includes("does not exist")
          ) {
            return { feeds: [], schemaMissing: true };
          }
          console.warn("[ical] Erro ao listar feeds:", error.message);
          return { feeds: [] };
        }

        return {
          feeds: (data as FlatIcalFeed[]) || [],
          schemaMissing: false,
        };
      } catch (err) {
        console.warn("[ical] Exceção ao listar feeds:", err);
        return { feeds: [] };
      }
    },

    /**
     * Lista todos os bloqueios de datas vindos de calendários externos (Airbnb, Booking, etc.).
     */
    async listExternalBlocks(flatId?: string): Promise<ExternalCalendarBlock[]> {
      try {
        const today = new Date().toISOString().split("T")[0];
        const base = client.from("external_calendar_blocks").select("*");

        const { data, error } = flatId
          ? await base
              .eq("flat_id", flatId)
              .gte("data_fim", today)
              .order("data_inicio", { ascending: true })
          : await base.gte("data_fim", today).order("data_inicio", { ascending: true });

        if (error || !data) {
          return [];
        }

        return data as ExternalCalendarBlock[];
      } catch {
        return [];
      }
    },

    /**
     * Cadastra um novo link de calendário iCal externo para um flat.
     */
    async addFeed(
      input: CreateIcalFeedInput,
    ): Promise<{ ok: boolean; data?: FlatIcalFeed; error?: string }> {
      let cleanUrl = input.icalUrl.trim();
      if (!cleanUrl) {
        return { ok: false, error: "Informe a URL do calendário iCal (.ics)." };
      }

      // Converte links webcal:// (comuns no Apple/Airbnb) para https://
      if (cleanUrl.toLowerCase().startsWith("webcal://")) {
        cleanUrl = `https://${cleanUrl.slice("webcal://".length)}`;
      }

      if (
        !cleanUrl.toLowerCase().startsWith("https://") &&
        !cleanUrl.toLowerCase().startsWith("http://")
      ) {
        return {
          ok: false,
          error: "A URL do calendário deve começar com https:// ou webcal://.",
        };
      }

      const defaultName =
        input.plataforma === "airbnb"
          ? "Airbnb"
          : input.plataforma === "booking"
            ? "Booking.com"
            : "Calendário Externo";

      const { data, error } = await client
        .from("flat_ical_feeds")
        .insert({
          flat_id: input.flatId,
          plataforma: input.plataforma,
          nome: input.nome.trim() || defaultName,
          ical_url: cleanUrl,
        })
        .select("*")
        .single();

      if (error || !data) {
        if (
          error?.code === "42P01" ||
          error?.message?.includes("flat_ical_feeds")
        ) {
          return {
            ok: false,
            error:
              "As tabelas de sincronização iCal ainda não foram criadas no Supabase. Execute o script SQL indicado abaixo no SQL Editor do Supabase.",
          };
        }
        return {
          ok: false,
          error: `Não foi possível salvar o calendário: ${error?.message || "Erro desconhecido"}`,
        };
      }

      return { ok: true, data: data as FlatIcalFeed };
    },

    /**
     * Remove um link de calendário externo e todos os seus bloqueios associados.
     */
    async deleteFeed(feedId: string): Promise<{ ok: boolean; error?: string }> {
      const { error } = await client.from("flat_ical_feeds").delete().eq("id", feedId);

      if (error) {
        return {
          ok: false,
          error: `Falha ao remover calendário: ${error.message}`,
        };
      }

      return { ok: true };
    },

    /**
     * Aciona a rota de sincronização no servidor para buscar e importar os arquivos .ics.
     */
    async triggerSync(options?: {
      flatId?: string;
      feedId?: string;
      force?: boolean;
    }): Promise<{
      ok: boolean;
      results: IcalSyncFeedResult[];
      error?: string;
    }> {
      try {
        const response = await fetch("/api/ical/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(options || {}),
        });

        const json = (await response.json()) as {
          ok: boolean;
          results?: IcalSyncFeedResult[];
          error?: string;
        };

        if (!response.ok || !json.ok) {
          return {
            ok: false,
            results: json.results || [],
            error: json.error || "Falha ao sincronizar calendários externos.",
          };
        }

        return {
          ok: true,
          results: json.results || [],
        };
      } catch (err) {
        return {
          ok: false,
          results: [],
          error:
            err instanceof Error
              ? err.message
              : "Erro de conexão ao sincronizar calendários.",
        };
      }
    },
  };
}

export type IcalService = ReturnType<typeof createIcalService>;

let browserIcalService: IcalService | null = null;

export function getBrowserIcalService(): IcalService {
  browserIcalService ??= createIcalService(createSupabaseBrowserClient());
  return browserIcalService;
}
