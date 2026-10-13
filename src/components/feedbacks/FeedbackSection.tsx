"use client";

import { SparklesIcon, StarFilledIcon } from "@/components/ui/icons";
import { FeedbackCard } from "@/components/feedbacks/FeedbackCard";
import { FeedbackForm } from "@/components/feedbacks/FeedbackForm";
import { StarRating } from "@/components/feedbacks/StarRating";
import { useFeedback } from "@/hooks/useFeedback";
import type { FeedbackWithAuthor } from "@/types/feedbacks";

interface FeedbackSectionProps {
  flatId: string;
  isAuthenticated: boolean;
  initialFeedbacks?: FeedbackWithAuthor[];
  className?: string;
}

export function FeedbackSection({
  flatId,
  isAuthenticated,
  initialFeedbacks = [],
  className = "",
}: FeedbackSectionProps) {
  const {
    feedbacks,
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
  } = useFeedback({ flatId, initialFeedbacks });

  return (
    <section className={`flex flex-col gap-8 ${className}`} aria-labelledby="feedback-heading">
      {/* Cabeçalho da seção */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-5 text-amber-500" />
          <h2
            id="feedback-heading"
            className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50"
          >
            Avaliações dos Hóspedes
          </h2>
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Opiniões reais de quem já viveu a experiência na Casa da Pedra em Bananeiras.
        </p>
      </div>

      {/* Visão geral / Métricas de Avaliação */}
      <div className="grid grid-cols-1 gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900 sm:grid-cols-3 sm:p-8">
        {/* Nota média e estrelas */}
        <div className="flex flex-col items-center justify-center border-b border-stone-100 pb-6 sm:border-b-0 sm:border-r sm:pb-0 dark:border-stone-800">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
              {stats.totalCount > 0 ? stats.averageRating : "5.0"}
            </span>
            <span className="text-lg text-stone-400">/ 5</span>
          </div>

          <div className="mt-2">
            <StarRating value={Math.round(stats.averageRating)} size="md" />
          </div>

          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {stats.totalCount === 0
              ? "Sem avaliações ainda"
              : `${stats.totalCount} ${stats.totalCount === 1 ? "avaliação" : "avaliações"}`}
          </p>
        </div>

        {/* Barras de distribuição por estrelas */}
        <div className="flex flex-col justify-center gap-2 sm:col-span-2 sm:px-4">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star] || 0;
            const percent =
              stats.totalCount > 0 ? Math.round((count / stats.totalCount) * 100) : 0;

            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="flex w-12 items-center gap-1 text-stone-600 dark:text-stone-400">
                  {star} <StarFilledIcon className="size-3 text-amber-500" />
                </span>

                <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <span className="w-8 text-right font-medium text-stone-500 dark:text-stone-400">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulário de Nova Avaliação */}
      <FeedbackForm
        flatId={flatId}
        rating={rating}
        hoverRating={hoverRating}
        onRatingChange={setRating}
        onHoverRatingChange={setHoverRating}
        comment={comment}
        onCommentChange={setComment}
        onSubmit={submitFeedback}
        isSubmitting={isSubmitting}
        error={error}
        successMessage={successMessage}
        isAuthenticated={isAuthenticated}
      />

      {/* Grid de Feedbacks */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-50">
          Todas as avaliações ({feedbacks.length})
        </h3>

        {feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-800">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              Nenhuma avaliação cadastrada para este flat ainda.
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {isAuthenticated
                ? "Envie a primeira avaliação através do formulário acima!"
                : "Faça login e seja o primeiro hóspede a avaliar."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {feedbacks.map((item) => (
              <FeedbackCard key={item.id} feedback={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
