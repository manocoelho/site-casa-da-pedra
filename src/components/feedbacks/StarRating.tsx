"use client";

import { StarFilledIcon, StarIcon } from "@/components/ui/icons";

interface StarRatingProps {
  value: number;
  hoverValue?: number;
  onChange?: (val: number) => void;
  onHover?: (val: number) => void;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarRating({
  value,
  hoverValue = 0,
  onChange,
  onHover,
  interactive = false,
  size = "md",
  className = "",
}: StarRatingProps) {
  const sizeClass =
    size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-4.5";

  const effectiveValue = hoverValue > 0 ? hoverValue : value;

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      onMouseLeave={() => interactive && onHover?.(0)}
      role={interactive ? "radiogroup" : undefined}
      aria-label={`Nota: ${value} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= effectiveValue;

        if (interactive) {
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange?.(star)}
              onMouseEnter={() => onHover?.(star)}
              className="rounded-sm p-0.5 text-amber-500 transition-transform hover:scale-120 focus:outline-hidden dark:text-amber-400"
              aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
            >
              {isFilled ? (
                <StarFilledIcon className={sizeClass} />
              ) : (
                <StarIcon className={`${sizeClass} text-stone-300 dark:text-stone-600`} />
              )}
            </button>
          );
        }

        return (
          <span key={star} className="text-amber-500 dark:text-amber-400">
            {isFilled ? (
              <StarFilledIcon className={sizeClass} />
            ) : (
              <StarIcon className={`${sizeClass} text-stone-300 dark:text-stone-700`} />
            )}
          </span>
        );
      })}
    </div>
  );
}
