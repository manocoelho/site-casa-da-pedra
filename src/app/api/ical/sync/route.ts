import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseIcalContent } from "@/lib/ical";
import type { FlatIcalFeed, IcalSyncFeedResult, ParsedIcalEvent } from "@/types/ical";

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

interface SyncRequestPayload {
  flatId?: string;
  feedId?: string;
  force?: boolean;
}

async function executeSync(payload: SyncRequestPayload) {
  const supabase = await createSupabaseServerClient();

  type UntypedClient = {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => Promise<{ data: FlatIcalFeed[] | null; error: { message: string } | null }>;
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: FlatIcalFeed[] | null; error: { message: string } | null }>;
      };
    };
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;
  };

  const client = supabase as unknown as UntypedClient;

  // 1. Busca os feeds alvo
  let feedsResponse: { data: FlatIcalFeed[] | null; error: { message: string } | null };

  if (payload.feedId) {
    feedsResponse = await client.from("flat_ical_feeds").select("*").eq("id", payload.feedId);
  } else if (payload.flatId) {
    feedsResponse = await client
      .from("flat_ical_feeds")
      .select("*")
      .eq("flat_id", payload.flatId);
  } else {
    feedsResponse = await client
      .from("flat_ical_feeds")
      .select("*")
      .order("created_at", { ascending: true });
  }

  if (feedsResponse.error) {
    // Se a tabela ainda não foi criada no Supabase, retorna silenciosamente sem quebrar
    if (
      feedsResponse.error.message.includes("flat_ical_feeds") ||
      feedsResponse.error.message.includes("does not exist")
    ) {
      return { ok: true, results: [] as IcalSyncFeedResult[], schemaMissing: true };
    }
    return {
      ok: false,
      results: [] as IcalSyncFeedResult[],
      error: feedsResponse.error.message,
    };
  }

  const feeds = feedsResponse.data || [];
  const now = Date.now();
  const todayIso = new Date(now - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const results: IcalSyncFeedResult[] = [];

  for (const feed of feeds) {
    // Se não for forçado (ex: sync automático ao abrir página do flat), respeita intervalo de 5 min
    if (!payload.force && feed.last_synced_at && feed.last_sync_status === "ok") {
      const lastSyncMs = new Date(feed.last_synced_at).getTime();
      if (!Number.isNaN(lastSyncMs) && now - lastSyncMs < AUTO_SYNC_INTERVAL_MS) {
        results.push({
          feedId: feed.id,
          flatId: feed.flat_id,
          plataforma: feed.plataforma,
          nome: feed.nome,
          ok: true,
          eventsCount: feed.events_count,
        });
        continue;
      }
    }

    try {
      const response = await fetch(feed.ical_url, {
        method: "GET",
        cache: "no-store",
        headers: {
          "User-Agent":
            "CasaDaPedra-ChannelSync/1.0 (+https://site-casa-da-pedra.vercel.app)",
          Accept: "text/calendar, text/plain, */*",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        throw new Error(`Servidor remoto respondeu com HTTP ${response.status}.`);
      }

      const icsText = await response.text();
      const allEvents: ParsedIcalEvent[] = parseIcalContent(icsText);

      // Filtra apenas bloqueios vigentes ou futuros
      const activeEvents = allEvents.filter((ev) => ev.data_fim >= todayIso);

      const { error: rpcError } = await client.rpc("sync_ical_feed_blocks", {
        p_feed_id: feed.id,
        p_status: "ok",
        p_error: null,
        p_blocks: activeEvents,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      results.push({
        feedId: feed.id,
        flatId: feed.flat_id,
        plataforma: feed.plataforma,
        nome: feed.nome,
        ok: true,
        eventsCount: activeEvents.length,
      });
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : "Falha ao baixar ou processar o calendário .ics.";

      await client.rpc("sync_ical_feed_blocks", {
        p_feed_id: feed.id,
        p_status: "error",
        p_error: errMsg,
        p_blocks: [],
      });

      results.push({
        feedId: feed.id,
        flatId: feed.flat_id,
        plataforma: feed.plataforma,
        nome: feed.nome,
        ok: false,
        eventsCount: 0,
        error: errMsg,
      });
    }
  }

  return { ok: true, results };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as SyncRequestPayload;
    const outcome = await executeSync({
      flatId: body.flatId,
      feedId: body.feedId,
      force: body.force ?? true,
    });

    return NextResponse.json(outcome, { status: outcome.ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        results: [],
        error: err instanceof Error ? err.message : "Erro interno ao sincronizar.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const flatId = searchParams.get("flatId") || undefined;
  const force = searchParams.get("force") === "true";

  const outcome = await executeSync({ flatId, force });
  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 500 });
}
