import { useId, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, name, error, hint, id, className = "", ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={[
          "h-11 rounded-lg border bg-white px-3 text-sm text-stone-900 shadow-xs transition-colors",
          "placeholder:text-stone-400 focus:outline-none focus:ring-2",
          "dark:bg-stone-900 dark:text-stone-100",
          error
            ? "border-red-400 focus:ring-red-200 dark:border-red-500 dark:focus:ring-red-900"
            : "border-stone-300 focus:border-stone-500 focus:ring-stone-200 dark:border-stone-700 dark:focus:ring-stone-700",
          className,
        ].join(" ")}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
