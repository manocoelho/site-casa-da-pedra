"use client";

import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Image from "next/image";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ImageIcon } from "@/components/ui/icons";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import type { FlatPhoto } from "@/types/entities";

interface PhotoUploadFormProps {
  flatId: string;
  flatTitle?: string;
  onSuccess?: (photo: FlatPhoto) => void;
  className?: string;
}

/**
 * Formulário estritamente de UI para seleção de arquivos e exibição de progresso.
 * Toda a lógica de rede, armazenamento e banco está encapsulada no service e no hook.
 */
export function PhotoUploadForm({
  flatId,
  flatTitle,
  onSuccess,
  className = "",
}: PhotoUploadFormProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    file,
    previewUrl,
    progress,
    isUploading,
    error,
    successMessage,
    selectFile,
    upload,
    reset,
  } = usePhotoUpload(flatId, { onSuccess });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    selectFile(selected);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      selectFile(droppedFile);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <div
      className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      <div className="flex flex-col gap-1">
        <h4 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Adicionar nova foto
        </h4>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {flatTitle ? `Envie imagens para ${flatTitle}.` : "Envie uma foto para o flat selecionado."}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        {/* Dropzone para seleção do arquivo */}
        {!file && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              isDragOver
                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                : "border-stone-300 hover:border-amber-500 hover:bg-stone-50 dark:border-stone-700 dark:hover:border-amber-500 dark:hover:bg-stone-800/50"
            }`}
          >
            <input
              ref={fileInputRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="flex size-12 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition group-hover:scale-105 group-hover:bg-amber-100 group-hover:text-amber-800 dark:bg-stone-800 dark:text-stone-300 dark:group-hover:bg-amber-900/50 dark:group-hover:text-amber-200">
              <ImageIcon className="size-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-stone-800 dark:text-stone-200">
              Clique para selecionar ou arraste a imagem aqui
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Formatos aceitos: JPG, PNG, WebP ou AVIF (máx. 5 MB)
            </p>
          </div>
        )}

        {/* Prévia do arquivo selecionado antes de enviar */}
        {file && previewUrl && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950/50">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-stone-200 dark:bg-stone-800">
                <Image
                  src={previewUrl}
                  alt={file.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                  {file.name}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {formatBytes(file.size)} · {file.type.split("/")[1]?.toUpperCase()}
                </p>
              </div>

              {!isUploading && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                >
                  Trocar
                </button>
              )}
            </div>

            {/* Barra de progresso */}
            {isUploading && (
              <div className="flex flex-col gap-1.5" aria-live="polite">
                <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Spinner className="size-3 text-amber-500" />
                    {progress < 100
                      ? "Enviando para o Supabase Storage..."
                      : "Vinculando foto ao flat..."}
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {progress}%
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-200 ease-out"
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            )}

            {/* Ações do formulário */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                disabled={isUploading}
                onClick={reset}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                isLoading={isUploading}
                onClick={upload}
              >
                {isUploading ? "Enviando..." : "Enviar foto"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
