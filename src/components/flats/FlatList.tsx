import { FlatCard } from "@/components/flats/FlatCard";
import { buildWhatsAppUrl } from "@/lib/contact";
import type { FlatWithPhotos } from "@/types/entities";

interface FlatListProps {
  flats: FlatWithPhotos[];
  /** WhatsApp para consulta de disponibilidade (somente dígitos, com DDI). */
  whatsapp: string;
}

export function FlatList({ flats, whatsapp }: FlatListProps) {
  return (
    <section id="flats" className="scroll-mt-8 bg-stone-50 py-20 sm:py-28 dark:bg-stone-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
            Hospedagem
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
            Escolha o seu flat
          </h2>
          <p className="mt-4 text-lg text-stone-600 dark:text-stone-400">
            Espaços completos e aconchegantes para viver Bananeiras no seu ritmo — do café com
            vista para a serra às noites frias ao pé da fogueira.
          </p>
        </header>

        {flats.length > 0 ? (
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {flats.map((flat) => (
              <FlatCard
                key={flat.id}
                flat={flat}
                availabilityHref={buildWhatsAppUrl(
                  whatsapp,
                  `Olá! Gostaria de consultar a disponibilidade do ${flat.titulo}.`,
                )}
              />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-3xl border border-dashed border-stone-300 p-12 text-center text-stone-500 dark:border-stone-700">
            Nossos flats estarão disponíveis aqui em breve.
          </div>
        )}
      </div>
    </section>
  );
}
