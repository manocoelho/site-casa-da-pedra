"use server";

import { revalidatePath, updateTag } from "next/cache";
import { FLATS_CACHE_TAG } from "@/services/flats";

/**
 * Invalida o cache dos flats para que a landing page e o painel reflitam
 * adições, remoções ou edições instantaneamente.
 */
export async function revalidateFlatsCache() {
  try {
    updateTag(FLATS_CACHE_TAG);
    revalidatePath("/");
    revalidatePath("/admin");
  } catch (error) {
    console.error("[revalidateFlatsCache]", error);
  }
}

/**
 * Invalida o cache da página inicial quando textos ou imagem de capa forem alterados.
 */
export async function revalidateSiteContent() {
  try {
    revalidatePath("/");
    revalidatePath("/admin");
  } catch (error) {
    console.error("[revalidateSiteContent]", error);
  }
}
