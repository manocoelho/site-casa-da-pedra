"use client";

import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Image from "next/image";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { CheckIcon, ImageIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import type { FlatPhoto } from "@/types/entities";

interface PhotoUploadFormProps {
  flatId: string;
  flatTitle?: string;
  onSuccess?: (photo: FlatPhoto) => void;
  className?: string;
}

/**
 * Formulário de UI para seleção e envio de uma ou múltiplas fotos de uma só vez.
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
    items,
    overallProgress,
    isUploading,
    error,
    successMessage,
    addFiles,
    removeFile,
    upload,
    reset,
  } = usePhotoUpload(flatId, { onSuccess });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      // Limpa o value do input para permitir selecionar o mesmo arquivo novamente se desejar
      e.target.value = "";
    }
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  const completedCount = items.filter((i) => i.status === "done").length;

  return (
    <div
      className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h4 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Adicionar fotos (Upload Múltiplo)
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {flatTitle
              ? `Selecione uma ou várias imagens de uma só vez para ${flatTitle}.`
              : "Selecione uma ou várias fotos para o flat selecionado."}
          </p>
        </div>

        {items.length > 0 && !isUploading && (
          <Button
            type="button"
            variant="outline"
            className="h-8 px-3 text-xs"
            leftIcon={<PlusIcon className="size-3.5" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Adicionar mais fotos
          </Button>
        )}
      </div>

      {/* Input oculto com suporte a múltiplos arquivos */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <div className="mt-4 flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        {/* Dropzone para seleção de 1 ou mais arquivos */}
        {items.length === 0 && (
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
            <div className="flex size-12 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition group-hover:scale-105 group-hover:bg-amber-100 group-hover:text-amber-800 dark:bg-stone-800 dark:text-stone-300 dark:group-hover:bg-amber-900/50 dark:group-hover:text-amber-200">
              <ImageIcon className="size-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-stone-800 dark:text-stone-200">
              Clique para selecionar uma ou várias fotos (ou arraste aqui)
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Você pode selecionar várias imagens ao mesmo tempo · JPG, PNG, WebP ou AVIF (máx. 5 MB por foto)
            </p>
          </div>
        )}

        {/* Lista / Grade de prévias dos arquivos selecionados */}
        {items.length > 0 && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-2.5 dark:border-stone-800 dark:bg-stone-950/50"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-stone-200 dark:bg-stone-800">
                    <Image
                      src={item.previewUrl}
                      alt={item.file.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-stone-900 dark:text-stone-100">
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      {formatBytes(item.file.size)} ·{" "}
                      {item.file.type.split("/")[1]?.toUpperCase()}
                    </p>

                    {item.status === "uploading" && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-150"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {item.status === "done" && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckIcon className="size-3" />
                        Enviada
                      </span>
                    )}

                    {item.status === "error" && (
                      <p className="mt-1 truncate text-[11px] font-medium text-red-600 dark:text-red-400">
                        {item.error || "Erro ao enviar"}
                      </p>
                    )}
                  </div>

                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      title="Remover da fila"
                      aria-label={`Remover ${item.file.name}`}
                      className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-red-600 dark:hover:bg-stone-800 dark:hover:text-red-400"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Barra de progresso geral do lote */}
            {isUploading && (
              <div className="flex flex-col gap-1.5" aria-live="polite">
                <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Spinner className="size-3 text-amber-500" />
                    Enviando fotos ({completedCount}/{items.length} concluídas)...
                  </span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {overallProgress}%
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-200 ease-out"
                    style={{ width: `${overallProgress}%` }}
                    role="progressbar"
                    aria-valuenow={overallProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            )}

            {/* Ações do formulário */}
            <div className="flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                {items.length}{" "}
                {items.length === 1 ? "foto selecionada" : "fotos selecionadas"}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={isUploading}
                  onClick={reset}
                >
                  Limpar seleção
                </Button>
                <Button
                  variant="primary"
                  isLoading={isUploading}
                  onClick={upload}
                >
                  {isUploading
                    ? "Enviando fotos..."
                    : items.length === 1
                      ? "Enviar 1 foto"
                      : `Enviar ${items.length} fotos`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
