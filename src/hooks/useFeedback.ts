"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  calculateFeedbackStats,
  getBrowserFeedbacksService,
  type FeedbackStats,
} from "@/services/feedbacks";
import type { FeedbackWithAuthor } from "@/types/feedbacks";

interface UseFeedbackOptions {
  flatId: string;
  initialFeedbacks?: FeedbackWithAuthor[];
}

export function useFeedback({ flatId, initialFeedbacks = [] }: UseFeedbackOptions) {
  const [feedbacks, setFeedbacks] = useState<FeedbackWithAuthor[]>(initialFeedbacks);
  const [isLoading, setIsLoading] = useState<boolean>(initialFeedbacks.length === 0);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadFeedbacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const service = getBrowserFeedbacksService();
      const list = await service.listByFlat(flatId);
      setFeedbacks(list);
    } catch (err) {
      console.error("[useFeedback] Erro ao carregar feedbacks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [flatId]);

  useEffect(() => {
    if (initialFeedbacks.length > 0) return;

    let isMounted = true;
    getBrowserFeedbacksService()
      .listByFlat(flatId)
      .then((list) => {
        if (isMounted) {
          setFeedbacks(list);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("[useFeedback] Erro ao carregar feedbacks:", err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [flatId, initialFeedbacks.length]);

  const stats: FeedbackStats = useMemo(() => {
    return calculateFeedbackStats(feedbacks);
  }, [feedbacks]);

  const submitFeedback = useCallback(async () => {
    if (rating < 1 || rating > 5) {
      setError("Por favor, selecione uma nota de 1 a 5 estrelas.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const service = getBrowserFeedbacksService();
      const result = await service.createFeedback({
        flatId,
        nota: rating,
        comentario: comment,
      });

      if (!result.ok || !result.data) {
        setError(result.error || "Não foi possível registrar sua avaliação.");
        setIsSubmitting(false);
        return;
      }

      setFeedbacks((prev) => [result.data!, ...prev.filter((f) => f.id !== result.data!.id)]);
      setSuccessMessage("Avaliação enviada com sucesso! Obrigado pelo seu feedback.");
      setComment("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar avaliação.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [comment, flatId, rating]);

  return {
    feedbacks,
    isLoading,
    stats,
    rating,
    setRating,
    hoverRating,
    setHoverRating,
    comment,
    setComment,
    isSubmitting,
    error,
    successMessage,
    submitFeedback,
    refreshFeedbacks: loadFeedbacks,
  };
}
