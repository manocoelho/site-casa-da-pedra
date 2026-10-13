import {
  createSupabaseBrowserClient,
  type TypedSupabaseClient,
} from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { revalidateFlatsCache } from "@/app/admin/actions";
import type {
  AttachedFlatPhotoResult,
  StorageResult,
  UploadedStorageFile,
  UploadPhotoOptions,
} from "@/types/storage";

export const STORAGE_BUCKET = "flat-photos";
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (limite do bucket)
export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * Validação prévia de arquivo de imagem no cliente ou servidor.
 */
export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "Nenhum arquivo foi selecionado." };
  }

  if (
    !ALLOWED_PHOTO_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_PHOTO_MIME_TYPES)[number],
    )
  ) {
    return {
      valid: false,
      error: "Formato inválido. Use imagens JPG, PNG, WebP ou AVIF.",
    };
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `A imagem tem ${sizeMb} MB. O limite máximo é de 5 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Extrai o caminho interno do arquivo no bucket 'flat-photos' a partir de sua URL pública.
 * Retorna `null` caso a URL seja de asset local (ex.: /images/...) ou de outro bucket.
 */
export function extractStoragePathFromUrl(url: string): string | null {
  if (!url) return null;

  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;

  const rawPath = url.substring(index + marker.length);
  // Remove eventuais query parameters (ex.: ?v=123)
  const cleanPath = rawPath.split("?")[0];
  return decodeURIComponent(cleanPath);
}

/**
 * Upload com acompanhamento real de progresso via XMLHttpRequest no navegador.
 */
async function uploadViaXhr(
  url: string,
  token: string,
  publishableKey: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", publishableKey);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve({ ok: true });
      } else {
        let message = `Erro no upload (HTTP ${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body.message) message = body.message;
          else if (body.error) message = body.error;
        } catch {
          // ignore
        }
        resolve({ ok: false, error: message });
      }
    };

    xhr.onerror = () => {
      resolve({ ok: false, error: "Erro de conexão ao enviar a imagem." });
    };

    xhr.ontimeout = () => {
      resolve({ ok: false, error: "Tempo esgotado durante o envio da imagem." });
    };

    xhr.send(file);
  });
}

/**
 * Cria a camada de serviço de Storage integrada ao Supabase.
 * Pode ser usada tanto no cliente quanto no servidor através de injeção de dependência.
 */
export function createStorageService(supabase: TypedSupabaseClient) {
  return {
    /**
     * Retorna a URL pública de um arquivo salvo no bucket 'flat-photos'.
     */
    getPublicUrl(path: string): string {
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    },

    /**
     * Realiza o upload do arquivo para o bucket e calcula a URL pública.
     */
    async uploadFile(
      file: File,
      storagePath: string,
      options?: UploadPhotoOptions,
    ): Promise<StorageResult<UploadedStorageFile>> {
      const validation = validatePhotoFile(file);
      if (!validation.valid) {
        return { ok: false, error: validation.error || "Arquivo inválido." };
      }

      // Tenta upload com progresso via XHR se estiver no browser e tiver sessão
      if (typeof window !== "undefined" && typeof XMLHttpRequest !== "undefined") {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;

          if (token) {
            const uploadUrl = `${env.supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${encodeURI(storagePath)}`;
            const xhrResult = await uploadViaXhr(
              uploadUrl,
              token,
              env.supabasePublishableKey,
              file,
              options?.onProgress,
            );

            if (!xhrResult.ok) {
              return { ok: false, error: xhrResult.error };
            }

            const { data: urlData } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(storagePath);

            return {
              ok: true,
              data: {
                storagePath,
                publicUrl: urlData.publicUrl,
              },
            };
          }
        } catch (xhrError) {
          console.warn("[storage] Fallback para supabase.storage.upload:", xhrError);
        }
      }

      // Fallback padrão via SDK oficial
      if (options?.onProgress) options.onProgress(20);

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (error) {
        return { ok: false, error: `Erro no upload: ${error.message}` };
      }

      if (options?.onProgress) options.onProgress(100);

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      return {
        ok: true,
        data: {
          storagePath,
          publicUrl: urlData.publicUrl,
        },
      };
    },

    /**
     * Remove um arquivo do bucket pelo caminho relativo ou por sua URL pública.
     */
    async deleteFile(pathOrUrl: string): Promise<StorageResult> {
      const path = extractStoragePathFromUrl(pathOrUrl) || pathOrUrl;
      if (!path) {
        return { ok: true, data: undefined };
      }

      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      if (error) {
        return { ok: false, error: `Falha ao excluir arquivo do Storage: ${error.message}` };
      }

      return { ok: true, data: undefined };
    },

    /**
     * Envia o arquivo ao Storage e vincula o registro na tabela `flat_photos`.
     * Em caso de erro na inserção do banco, remove automaticamente o arquivo enviado (rollback).
     */
    async uploadAndAttachFlatPhoto(
      flatId: string,
      file: File,
      options?: UploadPhotoOptions,
    ): Promise<StorageResult<AttachedFlatPhotoResult>> {
      const validation = validatePhotoFile(file);
      if (!validation.valid) {
        return { ok: false, error: validation.error || "Arquivo inválido." };
      }

      // Gera um nome único e organizado por pasta de cada flat
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${crypto.randomUUID()}.${extension}`;
      const folder = options?.folder || flatId;
      const storagePath = `${folder}/${filename}`;

      // 1. Upload para o Supabase Storage
      const uploadResult = await this.uploadFile(file, storagePath, options);
      if (!uploadResult.ok) {
        return uploadResult;
      }

      const { publicUrl } = uploadResult.data;

      // 2. Persistência na tabela `flat_photos`
      const { data: photoRecord, error: dbError } = await supabase
        .from("flat_photos")
        .insert({
          flat_id: flatId,
          url_imagem: publicUrl,
        })
        .select("*")
        .single();

      if (dbError) {
        // Rollback: se falhar no banco, exclui do Storage para não deixar arquivos órfãos
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        return {
          ok: false,
          error: `Foto enviada, mas falhou ao salvar no banco: ${dbError.message}`,
        };
      }

      // 3. Invalida cache das rotas
      await revalidateFlatsCache();

      return {
        ok: true,
        data: {
          photo: photoRecord,
          storagePath,
        },
      };
    },

    /**
     * Exclui a foto da tabela `flat_photos` e, se for do Storage, apaga o arquivo físico.
     */
    async deleteFlatPhoto(photoId: string, photoUrl: string): Promise<StorageResult> {
      // 1. Exclui o registro da tabela
      const { error: dbError } = await supabase
        .from("flat_photos")
        .delete()
        .eq("id", photoId);

      if (dbError) {
        return {
          ok: false,
          error: `Falha ao remover foto do banco de dados: ${dbError.message}`,
        };
      }

      // 2. Se a foto pertencer ao bucket do Supabase Storage, remove o arquivo físico
      const storagePath = extractStoragePathFromUrl(photoUrl);
      if (storagePath) {
        const { error: storageError } = await supabase
          .storage
          .from(STORAGE_BUCKET)
          .remove([storagePath]);

        if (storageError) {
          console.warn("[storage] Registro removido, mas falha ao limpar Storage:", storageError.message);
        }
      }

      // 3. Invalida cache das páginas
      await revalidateFlatsCache();

      return { ok: true, data: undefined };
    },
  };
}

export type StorageService = ReturnType<typeof createStorageService>;

let browserStorageService: StorageService | null = null;

/**
 * Instância singleton do serviço de Storage para Client Components e hooks.
 */
export function getBrowserStorageService(): StorageService {
  browserStorageService ??= createStorageService(createSupabaseBrowserClient());
  return browserStorageService;
}
