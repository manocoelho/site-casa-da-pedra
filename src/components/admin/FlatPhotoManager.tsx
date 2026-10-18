"use client";

import { useState } from "react";
import Image from "next/image";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ImageIcon, StarFilledIcon, StarIcon, TrashIcon } from "@/components/ui/icons";
import { PhotoUploadForm } from "@/components/admin/PhotoUploadForm";
import { getBrowserFlatsService } from "@/services/flats";
import { getBrowserStorageService } from "@/services/storage";
import { revalidateFlatsCache } from "@/app/admin/actions";
import type { FlatPhoto, FlatWithPhotos } from "@/types/entities";

interface FlatPhotoManagerProps {
  flat: FlatWithPhotos;
  onPhotoAdded: (photo: FlatPhoto) => void;
  onPhotoDeleted: (photoId: string) => void;
  onCoverPhotoChanged?: (updatedPhoto: FlatPhoto) => void;
}

export function FlatPhotoManager({
  flat,
  onPhotoAdded,
  onPhotoDeleted,
  onCoverPhotoChanged,
}: FlatPhotoManagerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingCoverId, setSettingCoverId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleDelete(photo: FlatPhoto) {
    setError(null);
    setSuccessMsg(null);
    setDeletingId(photo.id);

    try {
      const storageService = getBrowserStorageService();
      const result = await storageService.deleteFlatPhoto(photo.id, photo.url_imagem);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setConfirmDeleteId(null);
      onPhotoDeleted(photo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir a foto.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetCover(photo: FlatPhoto) {
    setError(null);
    setSuccessMsg(null);
    setSettingCoverId(photo.id);

    try {
      const flatsService = getBrowserFlatsService();
      const updated = await flatsService.setCoverPhoto(photo.id, flat.flat_photos);
      await revalidateFlatsCache();
      onCoverPhotoChanged?.(updated);
      setSuccessMsg("Foto de capa do flat atualizada com sucesso!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível definir a foto como capa.",
      );
    } finally {
      setSettingCoverId(null);
    }
  }

  const photos = flat.flat_photos;

  return (
    <div className="flex flex-col gap-6">
      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      {/* Galeria de fotos existentes */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
              Galeria de fotos
            </h3>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {photos.length} {photos.length === 1 ? "foto" : "fotos"}
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Clique em <strong>Definir como Capa</strong> em qualquer foto para destacá-la como foto principal do flat.
          </p>
        </div>

        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 p-12 text-center dark:border-stone-800">
            <div className="flex size-12 items-center justify-center rounded-full bg-stone-100 text-stone-400 dark:bg-stone-800">
              <ImageIcon className="size-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-stone-700 dark:text-stone-300">
              Nenhuma foto cadastrada para este flat.
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Faça o upload de uma ou várias fotos utilizando o formulário abaixo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {photos.map((photo, index) => {
              const isCover = index === 0;
              const isDeleting = deletingId === photo.id;
              const isSettingCover = settingCoverId === photo.id;
              const isConfirming = confirmDeleteId === photo.id;

              return (
                <div
                  key={photo.id}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-xs transition hover:shadow-md dark:bg-stone-900 ${
                    isCover
                      ? "border-amber-500 ring-2 ring-amber-500/30 dark:border-amber-400"
                      : "border-stone-200 dark:border-stone-800"
                  }`}
                >
                  {/* Container da foto */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                    <Image
                      src={photo.url_imagem}
                      alt={`${flat.titulo} — foto ${index + 1}`}
                      fill
                      sizes="(min-width: 768px) 33vw, 50vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />

                    {/* Badges */}
                    <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                      <span className="rounded-full bg-stone-950/70 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
                        #{index + 1}
                      </span>
                      {isCover && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-stone-950 shadow-xs">
                          <StarFilledIcon className="size-3" />
                          Capa Principal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de ações (Definir como Capa + Excluir) */}
                  <div className="flex items-center justify-between gap-2 border-t border-stone-100 p-3 dark:border-stone-800">
                    {isCover ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        <StarFilledIcon className="size-3.5" />
                        Foto de Capa Atual
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCover(photo)}
                        disabled={isSettingCover || isDeleting}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-amber-500 dark:hover:bg-amber-950/50 dark:hover:text-amber-200"
                      >
                        {isSettingCover ? (
                          <Spinner className="size-3.5 text-amber-600" />
                        ) : (
                          <StarIcon className="size-3.5 text-amber-500" />
                        )}
                        <span>{isSettingCover ? "Definindo..." : "Definir como Capa"}</span>
                      </button>
                    )}

                    {isConfirming ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                          Excluir?
                        </span>
                        <Button
                          variant="ghost"
                          className="h-7 px-2 text-xs text-stone-600 hover:text-stone-900"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isDeleting}
                        >
                          Não
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDelete(photo)}
                          disabled={isDeleting}
                          className="inline-flex h-7 items-center justify-center rounded-md bg-red-600 px-2.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {isDeleting ? <Spinner className="size-3" /> : "Sim"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(photo.id)}
                        disabled={isDeleting || isSettingCover}
                        aria-label={`Excluir foto ${index + 1}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <TrashIcon className="size-3.5" />
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Formulário de upload múltiplo dedicado para o flat */}
      <PhotoUploadForm
        flatId={flat.id}
        flatTitle={flat.titulo}
        onSuccess={onPhotoAdded}
      />
    </div>
  );
}
