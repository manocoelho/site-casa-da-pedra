import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createFlatsService, FLATS_CACHE_TAG } from "@/services/flats";
import type { FlatWithPhotos } from "@/types/entities";

/**
 * Flats em destaque para a landing page (leitura pública com cache no servidor).
 *
 * Em caso de falha (banco indisponível, env ausente no build etc.), retorna `[]`
 * com cache curto para reavaliar na próxima requisição.
 */
export async function getFeaturedFlats(limit = 2): Promise<FlatWithPhotos[]> {
  "use cache";
  cacheTag(FLATS_CACHE_TAG);

  try {
    const flats = await createFlatsService(createSupabasePublicClient()).listWithPhotos({ limit });
    cacheLife("hours");
    return flats;
  } catch (error) {
    console.error("[flats.server] getFeaturedFlats:", error instanceof Error ? error.message : error);
    cacheLife("minutes");
    return [];
  }
}
