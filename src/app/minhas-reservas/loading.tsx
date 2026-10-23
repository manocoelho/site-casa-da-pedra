import { Spinner } from "@/components/ui/Spinner";

export default function MinhasReservasLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-20 sm:px-6">
      <Spinner className="size-8 text-amber-600" />
      <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
        Carregando suas reservas...
      </p>
    </main>
  );
}
