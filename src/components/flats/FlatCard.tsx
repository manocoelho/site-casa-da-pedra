import Link from "next/link";
import { ImageCarousel, type CarouselImage } from "@/components/ui/ImageCarousel";
import { UsersIcon, WhatsAppIcon } from "@/components/ui/icons";
import { formatCurrency, formatGuests } from "@/lib/format";
import type { FlatWithPhotos } from "@/types/entities";

interface FlatCardProps {
  flat: FlatWithPhotos;
  /** Link para consultar disponibilidade (ex.: WhatsApp com mensagem pronta). */
  availabilityHref: string;
}

export function FlatCard({ flat, availabilityHref }: FlatCardProps) {
  const images: CarouselImage[] = flat.flat_photos.map((photo, index) => ({
    src: photo.url_imagem,
    alt: `${flat.titulo} — foto ${index + 1}`,
  }));

  return (
    <article className="group/card flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-xl dark:border-stone-800 dark:bg-stone-900">
      <ImageCarousel images={images} label={`Fotos do ${flat.titulo}`} />

      <div className="flex flex-1 flex-col gap-4 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            {flat.titulo}
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            <UsersIcon className="size-3.5" />
            Até {formatGuests(flat.max_hospedes)}
          </span>
        </div>

        <p className="line-clamp-3 text-stone-600 dark:text-stone-400">{flat.descricao}</p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-stone-100 pt-5 dark:border-stone-800">
          <p className="text-stone-500 dark:text-stone-400">
            <span className="text-3xl font-semibold text-stone-900 dark:text-stone-50">
              {formatCurrency(flat.preco_diaria)}
            </span>{" "}
            <span className="text-sm">/ noite</span>
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={`/flats/${flat.id}`}
              className="inline-flex h-11 items-center justify-center rounded-full bg-stone-900 px-5 text-sm font-medium text-white transition hover:bg-stone-700 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
            >
              Ver e Reservar
            </Link>
            <a
              href={availabilityHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Consultar via WhatsApp"
              className="inline-flex size-11 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <WhatsAppIcon className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
