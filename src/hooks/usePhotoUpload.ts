"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserStorageService, validatePhotoFile } from "@/services/storage";
import type { FlatPhoto } from "@/types/entities";

interface UsePhotoUploadOptions {
  onSuccess?: (photo: FlatPhoto) => void;
  onError?: (error: string) => void;
}

export function usePhotoUpload(flatId: string, options?: UsePhotoUploadOptions) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Libera a memória da URL temporária criada para pré-visualização
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const selectFile = useCallback((selected: File | null) => {
    setError(null);
    setSuccessMessage(null);
    setProgress(0);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (!selected) {
      setFile(null);
      return;
    }

    const validation = validatePhotoFile(selected);
    if (!validation.valid) {
      setError(validation.error || "Arquivo inválido.");
      setFile(null);
      return;
    }

    setFile(selected);
    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  }, [previewUrl]);

  const reset = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setProgress(0);
    setError(null);
    setSuccessMessage(null);
    setIsUploading(false);
  }, [previewUrl]);

  const upload = useCallback(async () => {
    if (!file || isUploading) return;

    setError(null);
    setSuccessMessage(null);
    setProgress(5);
    setIsUploading(true);

    try {
      const storageService = getBrowserStorageService();
      const result = await storageService.uploadAndAttachFlatPhoto(flatId, file, {
        onProgress: (percent) => setProgress(percent),
      });

      if (!result.ok) {
        setError(result.error);
        options?.onError?.(result.error);
        setIsUploading(false);
        return;
      }

      setProgress(100);
      setSuccessMessage("Foto enviada e vinculada com sucesso!");
      options?.onSuccess?.(result.data.photo);

      // Limpa a seleção após envio bem-sucedido
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setFile(null);
      setPreviewUrl(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao realizar upload.";
      setError(msg);
      options?.onError?.(msg);
    } finally {
      setIsUploading(false);
    }
  }, [file, isUploading, flatId, previewUrl, options]);

  return {
    file,
    previewUrl,
    progress,
    isUploading,
    error,
    successMessage,
    selectFile,
    upload,
    reset,
  };
}
