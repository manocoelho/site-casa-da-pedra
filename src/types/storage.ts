import type { FlatPhoto } from "./entities";

/** Opções para upload de foto de um flat. */
export interface UploadPhotoOptions {
  /** Callback para progresso percentual (0 a 100). */
  onProgress?: (percent: number) => void;
  /** Subpasta personalizada (padrão: id do flat). */
  folder?: string;
}

/** Resultado padronizado das operações de Storage. */
export type StorageResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Dados retornados após upload de arquivo no Storage. */
export interface UploadedStorageFile {
  publicUrl: string;
  storagePath: string;
}

/** Resposta do upload associado a um flat. */
export interface AttachedFlatPhotoResult {
  photo: FlatPhoto;
  storagePath: string;
}
