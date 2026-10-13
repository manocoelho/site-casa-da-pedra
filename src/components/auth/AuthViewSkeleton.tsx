/** Placeholder exibido enquanto a tela de autenticação carrega (fallback do Suspense). */
export function AuthViewSkeleton() {
  return (
    <div className="w-full max-w-md animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-3 h-8 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
      <div className="mb-8 h-4 w-full rounded bg-stone-200 dark:bg-stone-800" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-11 rounded-lg bg-stone-200 dark:bg-stone-800" />
        ))}
      </div>
    </div>
  );
}
