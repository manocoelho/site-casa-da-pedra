import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{subtitle}</p>}
      </header>

      <div className="flex flex-col gap-6">{children}</div>

      {footer && (
        <footer className="mt-8 text-center text-sm text-stone-600 dark:text-stone-400">
          {footer}
        </footer>
      )}
    </div>
  );
}
