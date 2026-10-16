import type { NextRequest } from "next/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { generateIcalContent } from "@/lib/ical";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface NativeReservationRow {
  id?: string;
  data_inicio: string;
  data_fim: string;
  status?: string;
  created_at?: string;
}

/**
 * Endpoint público de exportação iCal (.ics) para cada Flat.
 * URL para colar no Airbnb / Booking.com:
 * https://site-casa-da-pedra.vercel.app/api/ical/{flatId}.ics
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ flatId: string }> },
) {
  const { flatId: rawFlatId } = await context.params;
  const flatId = rawFlatId.replace(/\.ics$/i, "").trim();

  if (!UUID_REGEX.test(flatId)) {
    return new Response("ID do flat inválido.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const supabase = createSupabasePublicClient();

  // 1. Busca dados do flat
  const { data: flat, error: flatError } = await supabase
    .from("flats")
    .select("id, titulo")
    .eq("id", flatId)
    .maybeSingle();

  if (flatError || !flat) {
    return new Response("Flat não encontrado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 2. Busca as reservas nativas do site (sem re-exportar bloqueios vindos de fora)
  type RpcCaller = (
    fn: string,
    args: { p_flat_id: string },
  ) => Promise<{ data: NativeReservationRow[] | null; error: unknown }>;

  const rpcCaller = supabase.rpc as unknown as RpcCaller;
  let reservations: NativeReservationRow[] = [];

  const { data: nativeData, error: nativeError } = await rpcCaller(
    "get_flat_native_reservations_ical",
    { p_flat_id: flatId },
  );

  if (!nativeError && Array.isArray(nativeData)) {
    reservations = nativeData;
  } else {
    // Fallback caso a RPC nova ainda não tenha sido criada no banco
    const { data: fallbackData } = await rpcCaller("get_flat_occupied_ranges", {
      p_flat_id: flatId,
    });
    if (Array.isArray(fallbackData)) {
      reservations = fallbackData;
    }
  }

  const icsContent = generateIcalContent({
    flatId: flat.id,
    flatTitle: flat.titulo,
    reservations,
  });

  return new Response(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="casa-da-pedra-${flat.id}.ics"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
