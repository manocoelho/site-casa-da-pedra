"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/feedbacks/StarRating";
import { ROUTES } from "@/lib/routes";

interface FeedbackFormProps {
  flatId: string;
  rating: number;
  hoverRating: number;
  onRatingChange: (val: number) => void;
  onHoverRatingChange: (val: number) => void;
  comment: string;
  onCommentChange: (val: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  isAuthenticated: boolean;
  className?: string;
}

export function FeedbackForm({
  flatId,
  rating,
  hoverRating,
  onRatingChange,
  onHoverRatingChange,
  comment,
  onCommentChange,
  onSubmit,
  isSubmitting,
  error,
  successMessage,
  isAuthenticated,
  className = "",
}: FeedbackFormProps) {
  if (!isAuthenticated) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-6 text-center dark:border-stone-800 dark:bg-stone-900/40 ${className}`}
      >
        <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
          Quer compartilhar sua experiência sobre este flat?
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Faça login para deixar sua nota e comentário.
        </p>
        <Link
          href={`${ROUTES.login}?next=${encodeURIComponent(`/flats/${flatId}`)}`}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-stone-900 px-4 text-xs font-semibold text-white transition hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
        >
          Entrar para avaliar
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={`flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      <div>
        <h4 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Deixe sua avaliação
        </h4>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Compartilhe com outros viajantes como foi sua experiência.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      {/* Seleção de estrelas */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
          Sua nota:
        </label>
        <div className="flex items-center gap-2">
          <StarRating
            value={rating}
            hoverValue={hoverRating}
            onChange={onRatingChange}
            onHover={onHoverRatingChange}
            interactive
            size="lg"
          />
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
            {hoverRating > 0 ? hoverRating : rating} de 5 estrelas
          </span>
        </div>
      </div>

      {/* Campo de comentário */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="feedback-comment"
          className="text-xs font-medium text-stone-700 dark:text-stone-300"
        >
          Seu comentário (opcional):
        </label>
        <textarea
          id="feedback-comment"
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Conte detalhes sobre o conforto, a vista, a localização e a recepção..."
          className="w-full resize-none rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-900 transition placeholder:text-stone-400 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500"
        />
        <div className="flex justify-end text-[11px] text-stone-400">
          {comment.length} / 2000 caracteres
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={isSubmitting || rating < 1}
        >
          {isSubmitting ? "Enviando avaliação..." : "Publicar avaliação"}
        </Button>
      </div>
    </form>
  );
}
