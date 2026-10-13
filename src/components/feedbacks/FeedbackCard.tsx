import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckIcon } from "@/components/ui/icons";
import { StarRating } from "@/components/feedbacks/StarRating";
import type { FeedbackWithAuthor } from "@/types/feedbacks";

interface FeedbackCardProps {
  feedback: FeedbackWithAuthor;
  className?: string;
}

export function FeedbackCard({ feedback, className = "" }: FeedbackCardProps) {
  const authorName = feedback.autor_nome || "Hóspede";
  const initial = authorName.charAt(0).toUpperCase();

  const formattedDate = feedback.created_at
    ? format(new Date(feedback.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition hover:shadow-sm dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar com iniciais */}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
            {initial}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-semibold text-stone-900 dark:text-stone-100">
                {authorName}
              </h4>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckIcon className="size-2.5" />
                Estadia confirmada
              </span>
            </div>
            {formattedDate && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {formattedDate}
              </p>
            )}
          </div>
        </div>

        {/* Avaliação em estrelas */}
        <StarRating value={feedback.nota} size="sm" />
      </div>

      {feedback.comentario && (
        <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          “{feedback.comentario}”
        </p>
      )}
    </article>
  );
}
