"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBrowserStorageService, validatePhotoFile } from "@/services/storage";
import type { FlatPhoto } from "@/types/entities";

export interface PhotoUploadItem {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface UsePhotoUploadOptions {
  onSuccess?: (photo: FlatPhoto) => void;
  onError?: (error: string) => void;
}

export function usePhotoUpload(flatId: string, options?: UsePhotoUploadOptions) {
  const [items, setItems] = useState<PhotoUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const itemsRef = useRef<PhotoUploadItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Libera memória das URLs temporárias ao desmontar
  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
  }, []);

  const addFiles = useCallback((fileList: FileList | File[] | null) => {
    if (!fileList) return;
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    setError(null);
    setSuccessMessage(null);

    const newItems: PhotoUploadItem[] = [];
    const validationErrors: string[] = [];

    for (const selected of filesArray) {
      const validation = validatePhotoFile(selected);
      if (!validation.valid) {
        validationErrors.push(`${selected.name}: ${validation.error || "Arquivo inválido."}`);
        continue;
      }

      const objectUrl = URL.createObjectURL(selected);
      newItems.push({
        id: `${selected.name}-${selected.size}-${crypto.randomUUID()}`,
        file: selected,
        previewUrl: objectUrl,
        progress: 0,
        status: "pending",
      });
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join(" | "));
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const reset = useCallback(() => {
    setItems((prev) => {
      for (const item of prev) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
      return [];
    });
    setError(null);
    setSuccessMessage(null);
    setIsUploading(false);
  }, []);

  const upload = useCallback(async () => {
    const toUpload = itemsRef.current.filter(
      (item) => item.status === "pending" || item.status === "error",
    );
    if (toUpload.length === 0 || isUploading) return;

    setError(null);
    setSuccessMessage(null);
    setIsUploading(true);

    const storageService = getBrowserStorageService();
    let uploadedCount = 0;
    const failedMessages: string[] = [];

    try {
      for (const current of toUpload) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === current.id
              ? { ...item, status: "uploading", progress: 5, error: undefined }
              : item,
          ),
        );

        const result = await storageService.uploadAndAttachFlatPhoto(
          flatId,
          current.file,
          {
            onProgress: (percent) => {
              setItems((prev) =>
                prev.map((item) =>
                  item.id === current.id ? { ...item, progress: percent } : item,
                ),
              );
            },
          },
        );

        if (!result.ok) {
          failedMessages.push(`${current.file.name}: ${result.error}`);
          setItems((prev) =>
            prev.map((item) =>
              item.id === current.id
                ? { ...item, status: "error", progress: 0, error: result.error }
                : item,
            ),
          );
          options?.onError?.(result.error);
          continue;
        }

        uploadedCount++;
        setItems((prev) =>
          prev.map((item) =>
            item.id === current.id
              ? { ...item, status: "done", progress: 100 }
              : item,
          ),
        );
        options?.onSuccess?.(result.data.photo);
      }

      if (failedMessages.length === 0) {
        // Todas as fotos foram enviadas com sucesso: limpa a fila
        setItems((prev) => {
          for (const item of prev) {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          }
          return [];
        });
        setSuccessMessage(
          uploadedCount === 1
            ? "1 foto enviada e vinculada com sucesso!"
            : `${uploadedCount} fotos enviadas e vinculadas com sucesso!`,
        );
      } else {
        // Mantém apenas as que falharam para o usuário tentar novamente ou remover
        setItems((prev) => {
          const remaining: PhotoUploadItem[] = [];
          for (const item of prev) {
            if (item.status === "done") {
              if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            } else {
              remaining.push(item);
            }
          }
          return remaining;
        });

        if (uploadedCount > 0) {
          setSuccessMessage(
            `${uploadedCount} ${uploadedCount === 1 ? "foto enviada" : "fotos enviadas"} com sucesso.`,
          );
        }
        setError(`Falha em ${failedMessages.length} arquivo(s): ${failedMessages.join(" | ")}`);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro inesperado ao realizar upload.";
      setError(msg);
      options?.onError?.(msg);
    } finally {
      setIsUploading(false);
    }
  }, [flatId, isUploading, options]);

  // Progresso médio geral do lote
  const overallProgress = useMemo(() => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, i) => acc + i.progress, 0);
    return Math.round(sum / items.length);
  }, [items]);

  return {
    items,
    overallProgress,
    isUploading,
    error,
    successMessage,
    addFiles,
    removeFile,
    upload,
    reset,
  };
}
