import Link from "next/link";
import { ShieldIcon } from "@/components/ui/icons";
import { ROUTES } from "@/lib/routes";

export function AccessDenied({ userEmail }: { userEmail?: string }) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-lg dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
          <ShieldIcon className="size-7" />
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          Acesso Restrito
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Esta área é reservada exclusivamente para administradores da{" "}
          <strong>Casa da Pedra</strong>.
        </p>

        {userEmail && (
          <div className="mt-4 rounded-xl bg-stone-50 p-3 text-xs text-stone-600 dark:bg-stone-950/50 dark:text-stone-400">
            Você está conectado como: <strong className="font-semibold">{userEmail}</strong> (papel: cliente).
          </div>
        )}

        <div className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-left text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">Como liberar acesso ao dono?</p>
          <p className="mt-1 font-mono">
            Execute no SQL Editor do Supabase:
          </p>
          <code className="mt-1.5 block overflow-x-auto rounded bg-white/80 p-2 font-mono text-[11px] text-stone-800 dark:bg-stone-900 dark:text-amber-200">
            UPDATE public.users SET role = &apos;admin&apos; WHERE email = &apos;{userEmail || "seu-email@exemplo.com"}&apos;;
          </code>
        </div>

        <div className="mt-8 flex flex-col gap-2.5">
          <Link
            href={ROUTES.home}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
          >
            Voltar para a página inicial
          </Link>
          <Link
            href={ROUTES.login}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 px-4 text-xs font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Entrar com outra conta
          </Link>
        </div>
      </div>
    </div>
  );
}
