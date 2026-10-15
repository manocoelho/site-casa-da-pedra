import Image from "next/image";
import type { HeroContent } from "@/config/site";
import { ArrowDownIcon, ExternalLinkIcon, MapPinIcon } from "@/components/ui/icons";

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=R.+Antonio+Maia%2C+140+-+Bananeiras+PB%2C+58220-000";

export function HeroSection({ eyebrow, title, slogan, image, cta, highlights }: HeroContent) {
  const isContain = image.fit === "contain";
  const position = image.position || "center 25%";

  return (
    <section className="relative isolate flex min-h-[80svh] sm:min-h-[85svh] items-end overflow-hidden bg-stone-950">
      {/* Se o modo for contain, exibe um fundo ambiente espelhado/desfocado para dar profundidade */}
      {isContain ? (
        <>
          <Image
            src={image.src}
            alt=""
            fill
            sizes="100vw"
            quality={60}
            aria-hidden="true"
            className="-z-30 object-cover blur-2xl scale-110 opacity-35"
          />
          <Image
            src={image.src}
            alt={image.alt}
            fill
            preload
            sizes="100vw"
            quality={95}
            placeholder={typeof image.src === "string" ? "empty" : "blur"}
            className="-z-20 object-contain object-center sm:object-right-top"
          />
        </>
      ) : (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          preload
          sizes="100vw"
          quality={95}
          placeholder={typeof image.src === "string" ? "empty" : "blur"}
          className="-z-20 object-cover transition-all duration-300"
          style={{ objectPosition: position }}
        />
      )}

      {/* Overlays modernos direcionados para preservar a nitidez e as luzes da foto */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-stone-950/95 via-stone-950/20 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-full sm:w-3/5 -z-10 bg-gradient-to-r from-stone-950/75 via-stone-950/20 to-transparent" />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-32 sm:px-6 sm:pb-24">
        {/* Localização e Pino Interativo */}
        <div className="flex flex-col items-start gap-2.5">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-200 backdrop-blur">
            <MapPinIcon className="size-3.5" />
            {eyebrow}
          </p>

          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir no Google Maps: R. Antonio Maia, 140 - Bananeiras PB, 58220-000"
            className="group inline-flex max-w-full items-center gap-2 rounded-full border border-amber-400/35 bg-stone-950/80 px-3 py-1.5 text-xs font-medium text-stone-200 shadow-sm backdrop-blur-md transition hover:border-amber-400 hover:bg-stone-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 transition-colors group-hover:bg-amber-500 group-hover:text-stone-950">
              <MapPinIcon className="size-3" />
            </span>
            <span className="truncate underline-offset-2 group-hover:underline">
              R. Antonio Maia, 140 · Bananeiras - PB
            </span>
            <span className="hidden sm:inline text-stone-400 font-normal">, 58220-000</span>
            <ExternalLinkIcon className="size-3 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-300" />
          </a>
        </div>

        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white sm:text-7xl">
          {title}
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-200 sm:text-2xl sm:leading-relaxed">
          {slogan}
        </p>

        <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center">
          <a
            href={cta.href}
            className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-amber-500 px-8 text-base font-semibold text-stone-950 shadow-lg shadow-amber-900/30 transition hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
          >
            {cta.label}
            <ArrowDownIcon className="size-5 transition-transform group-hover:translate-y-0.5" />
          </a>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-200">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
