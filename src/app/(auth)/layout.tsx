/** Layout compartilhado de /login e /cadastro: painel decorativo + área do formulário. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid flex-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-stone-900 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--color-amber-700)_0%,_transparent_60%)] opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--color-stone-600)_0%,_transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-stone-100">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Casa da Pedra</p>
          <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight">
            Seu refúgio entre pedras, conforto e natureza.
          </h2>
          <p className="mt-4 max-w-md text-stone-300">
            Flats completos para estadias curtas ou longas, com reserva simples e atendimento direto.
          </p>
        </div>
      </aside>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">{children}</section>
    </main>
  );
}
