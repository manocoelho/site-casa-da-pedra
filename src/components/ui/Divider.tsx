export function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
      {label && (
        <span className="text-xs uppercase tracking-wide text-stone-500">{label}</span>
      )}
      <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
    </div>
  );
}
