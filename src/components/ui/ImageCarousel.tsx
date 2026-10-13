"use client";

import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon } from "@/components/ui/icons";
import { useCarousel } from "@/hooks/useCarousel";

export interface CarouselImage {
  src: string;
  alt: string;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  /** Rótulo acessível do carrossel (ex.: "Fotos do Flat Mirante"). */
  label: string;
  /** Atributo `sizes` do next/image, conforme a largura do carrossel no layout. */
  sizes?: string;
  className?: string;
}

export function ImageCarousel({
  images,
  label,
  sizes = "(min-width: 768px) 50vw, 100vw",
  className = "aspect-[4/3]",
}: ImageCarouselProps) {
  const { trackRef, activeIndex, goTo, next, prev, handleScroll, handleKeyDown } = useCarousel(
    images.length,
  );

  if (images.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-stone-200 text-stone-400 dark:bg-stone-800 ${className}`}
      >
        <ImageIcon className="size-10" />
        <span className="sr-only">Sem fotos disponíveis</span>
      </div>
    );
  }

  const hasMultiple = images.length > 1;

  return (
    <div
      role="region"
      aria-roledescription="carrossel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`group relative overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${className}`}
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, index) => (
          <div
            key={image.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} de ${images.length}`}
            aria-hidden={index !== activeIndex}
            className="relative h-full w-full shrink-0 snap-center"
          >
            <Image src={image.src} alt={image.alt} fill sizes={sizes} className="object-cover" />
          </div>
        ))}
      </div>

      {hasMultiple && (
        <>
          <CarouselButton direction="prev" onClick={prev} />
          <CarouselButton direction="next" onClick={next} />

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((image, index) => (
              <button
                key={image.src}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Ir para a foto ${index + 1}`}
                aria-current={index === activeIndex}
                className={`h-1.5 rounded-full bg-white shadow transition-all ${
                  index === activeIndex ? "w-6 opacity-100" : "w-1.5 opacity-60 hover:opacity-90"
                }`}
              />
            ))}
          </div>

          <span className="absolute right-3 top-3 rounded-full bg-stone-950/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            {activeIndex + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

function CarouselButton({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  const isPrev = direction === "prev";
  const Icon = isPrev ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrev ? "Foto anterior" : "Próxima foto"}
      className={`absolute top-1/2 ${isPrev ? "left-3" : "right-3"} flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-900 shadow-md backdrop-blur transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100`}
    >
      <Icon className="size-5" />
    </button>
  );
}
