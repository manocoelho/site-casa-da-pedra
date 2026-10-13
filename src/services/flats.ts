import {
  createSupabaseBrowserClient,
  type TypedSupabaseClient,
} from "@/lib/supabase/client";
import type { Flat, FlatInsert, FlatPhoto, FlatUpdate, FlatWithPhotos } from "@/types/entities";

export const FLATS_CACHE_TAG = "flats";

const FLAT_WITH_PHOTOS = "*, flat_photos(*)" as const;

/**
 * Serviço de flats e fotos no banco de dados.
 * Recebe o cliente Supabase por injeção para funcionar em Server e Client Components.
 */
export function createFlatsService(supabase: TypedSupabaseClient) {
  return {
    /**
     * Lista flats com suas respectivas fotos ordenadas.
     */
    async listWithPhotos({ limit }: { limit?: number } = {}): Promise<FlatWithPhotos[]> {
      let query = supabase
        .from("flats")
        .select(FLAT_WITH_PHOTOS)
        .order("created_at", { ascending: true })
        .order("created_at", { referencedTable: "flat_photos", ascending: true });

      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw new Error(`Falha ao listar flats: ${error.message}`);
      return data ?? [];
    },

    /**
     * Busca um flat específico com suas fotos pelo ID.
     */
    async getById(id: string): Promise<FlatWithPhotos | null> {
      const { data, error } = await supabase
        .from("flats")
        .select(FLAT_WITH_PHOTOS)
        .eq("id", id)
        .order("created_at", { referencedTable: "flat_photos", ascending: true })
        .maybeSingle();

      if (error) {
        console.error(`[flats] getById ${id}:`, error.message);
        return null;
      }
      return data;
    },

    /**
     * Atualiza dados de um flat (título, descrição, preço, max_hospedes).
     */
    async update(id: string, values: Partial<FlatUpdate>): Promise<Flat | null> {
      const { data, error } = await supabase
        .from("flats")
        .update(values)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        console.error(`[flats] update ${id}:`, error.message);
        throw new Error(`Falha ao atualizar flat: ${error.message}`);
      }
      return data;
    },

    /**
     * Cadastra um novo flat no banco de dados.
     */
    async create(values: FlatInsert): Promise<Flat> {
      const { data, error } = await supabase
        .from("flats")
        .insert(values)
        .select("*")
        .single();

      if (error) {
        console.error("[flats] create:", error.message);
        throw new Error(`Falha ao cadastrar flat: ${error.message}`);
      }
      return data;
    },

    /**
     * Remove um flat e suas fotos associadas.
     */
    async delete(id: string): Promise<boolean> {
      const { error } = await supabase
        .from("flats")
        .delete()
        .eq("id", id);

      if (error) {
        console.error(`[flats] delete ${id}:`, error.message);
        throw new Error(`Falha ao excluir flat: ${error.message}`);
      }
      return true;
    },

    /**
     * Registra uma nova foto diretamente na tabela flat_photos.
     */
    async addPhoto(flatId: string, url_imagem: string): Promise<FlatPhoto> {
      const { data, error } = await supabase
        .from("flat_photos")
        .insert({
          flat_id: flatId,
          url_imagem,
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(`Falha ao registrar foto no banco: ${error.message}`);
      }
      return data;
    },

    /**
     * Remove uma foto da tabela flat_photos.
     */
    async deletePhoto(photoId: string): Promise<boolean> {
      const { error } = await supabase
        .from("flat_photos")
        .delete()
        .eq("id", photoId);

      if (error) {
        console.error(`[flats] deletePhoto ${photoId}:`, error.message);
        throw new Error(`Falha ao excluir foto: ${error.message}`);
      }
      return true;
    },
  };
}

export type FlatsService = ReturnType<typeof createFlatsService>;

let browserFlatsService: FlatsService | null = null;

export function getBrowserFlatsService(): FlatsService {
  browserFlatsService ??= createFlatsService(createSupabaseBrowserClient());
  return browserFlatsService;
}
