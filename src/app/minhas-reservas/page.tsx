import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createReservationsService } from "@/services/reservations";
import { createSiteSettingsService } from "@/services/siteSettings";
import { MyReservationsList } from "@/components/reservations/MyReservationsList";
import { Spinner } from "@/components/ui/Spinner";
import { CalendarIcon } from "@/components/ui/icons";
import { ROUTES } from "@/lib/routes";

export const instant = false;

export const metadata: Metadata = {
  title: "Minhas Reservas | Casa da Pedra — Bananeiras, PB",
  description:
    "Acompanhe o status das suas reservas, pagamentos e informações de check-in na Casa da Pedra.",
};

async function MinhasReservasContent() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect(
      `${ROUTES.login}?next=${encodeURIComponent(ROUTES.minhasReservas)}`,
    );
  }

  const reservationsService = createReservationsService(supabase);
  const siteSettingsService = createSiteSettingsService(supabase);

  const [reservations, siteSettings] = await Promise.all([
    reservationsService.listMyReservationsWithFlats(),
    siteSettingsService.getSettings(),
  ]);

  return (
    <MyReservationsList
      initialReservations={reservations}
      whatsapp={siteSettings.whatsapp}
    />
  );
}

export default function MinhasReservasPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      {/* Navegação / Breadcrumb */}
      <nav aria-label="Navegação estrutural" className="text-xs text-stone-500">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              href={ROUTES.home}
              className="hover:text-stone-900 dark:hover:text-stone-200"
            >
              Início
            </Link>
          </li>
          <li>/</li>
          <li className="font-medium text-stone-900 dark:text-stone-100">
            Minhas Reservas
          </li>
        </ol>
      </nav>

      {/* Cabeçalho */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
            <CalendarIcon className="size-3.5" />
            Área do Hóspede
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
            Minhas Reservas
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Acompanhe o status da sua estadia, confira os dados de check-in ou
            conclua pagamentos pendentes.
          </p>
        </div>

        <Link
          href={ROUTES.home}
          className="inline-flex h-10 w-fit items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs font-semibold text-stone-800 shadow-2xs transition hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Explorar outros Flats
        </Link>
      </div>

      {/* Lista de Reservas */}
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-16">
            <Spinner className="size-8 text-amber-600" />
            <p className="mt-3 text-sm text-stone-500">
              Carregando suas reservas...
            </p>
          </div>
        }
      >
        <MinhasReservasContent />
      </Suspense>
    </main>
  );
}
