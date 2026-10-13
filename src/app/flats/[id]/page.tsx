import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createFlatsService } from "@/services/flats";
import { createFeedbacksService } from "@/services/feedbacks";
import { ImageCarousel, type CarouselImage } from "@/components/ui/ImageCarousel";
import { ReservationCard } from "@/components/reservations/ReservationCard";
import { FeedbackSection } from "@/components/feedbacks/FeedbackSection";
import { MapPinIcon, UsersIcon } from "@/components/ui/icons";
import { ROUTES } from "@/lib/routes";

export const instant = false;

interface FlatPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: FlatPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const flatsService = createFlatsService(supabase);
  const flat = await flatsService.getById(id);

  if (!flat) {
    return {
      title: "Flat não encontrado",
    };
  }

  return {
    title: `${flat.titulo} | Casa da Pedra — Bananeiras, PB`,
    description: flat.descricao,
  };
}

export default async function FlatDetailsPage({ params }: FlatPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [flatsService, feedbacksService, { data: userData }] = [
    createFlatsService(supabase),
    createFeedbacksService(supabase),
    await supabase.auth.getUser(),
  ];

  const flat = await flatsService.getById(id);
  if (!flat) {
    notFound();
  }

  const initialFeedbacks = await feedbacksService.listByFlat(id);
  const isAuthenticated = Boolean(userData?.user);

  const images: CarouselImage[] = flat.flat_photos.map((photo, index) => ({
    src: photo.url_imagem,
    alt: `${flat.titulo} — foto ${index + 1}`,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      {/* Navegação / Breadcrumbs */}
      <nav aria-label="Navegação estrutural" className="text-xs text-stone-500">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href={ROUTES.home} className="hover:text-stone-900 dark:hover:text-stone-200">
              Início
            </Link>
          </li>
          <li>/</li>
          <li className="font-medium text-stone-900 dark:text-stone-100 truncate max-w-xs sm:max-w-md">
            {flat.titulo}
          </li>
        </ol>
      </nav>

      {/* Galeria de Fotos */}
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-stone-100 shadow-md dark:border-stone-800 dark:bg-stone-900">
        <ImageCarousel images={images} label={`Galeria do ${flat.titulo}`} />
      </div>

      {/* Conteúdo Principal: Duas colunas no desktop */}
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-3">
        {/* Coluna Esquerda (2 cols): Informações, comodidades e feedbacks */}
        <div className="flex flex-col gap-10 lg:col-span-2">
          {/* Título e especificações */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <MapPinIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
                Bananeiras, Paraíba
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <UsersIcon className="size-3.5 text-stone-500" />
                Até {flat.max_hospedes} hóspedes
              </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
              {flat.titulo}
            </h1>

            <p className="text-base leading-relaxed text-stone-700 sm:text-lg dark:text-stone-300">
              {flat.descricao}
            </p>
          </div>

          {/* O que o flat oferece */}
          <div className="flex flex-col gap-4 border-t border-stone-200 pt-8 dark:border-stone-800">
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50">
              Comodidades inclusas
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-stone-700 sm:grid-cols-3 dark:text-stone-300">
              <div className="flex items-center gap-2">
                <span className="text-amber-600">✓</span>
                <span>Wi-Fi de alta velocidade</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-600">✓</span>
                <span>Cozinha equipada</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-600">✓</span>
                <span>Ar-condicionado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-600">✓</span>
                <span>Estacionamento gratuito</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-600">✓</span>
                <span>Chuveiro com aquecimento</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-600">✓</span>
                <span>Vista para as serras</span>
              </div>
            </div>
          </div>

          {/* Seção de Feedback com notas e avaliações */}
          <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
            <FeedbackSection
              flatId={flat.id}
              isAuthenticated={isAuthenticated}
              initialFeedbacks={initialFeedbacks}
            />
          </div>
        </div>

        {/* Coluna Direita (1 col): Card de Reserva Fixo */}
        <div className="sticky top-20 lg:col-span-1">
          <ReservationCard flat={flat} isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </div>
  );
}
