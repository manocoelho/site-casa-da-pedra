/**
 * Variáveis de ambiente públicas.
 *
 * Variáveis `NEXT_PUBLIC_*` precisam ser referenciadas literalmente
 * (`process.env.NEXT_PUBLIC_X`) para que o Next.js as injete no bundle do cliente.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Copie .env.example para .env.local e preencha os valores.`,
    );
  }
  return value;
}

export const env = {
  get supabaseUrl(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey(): string {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  },
  /** URL pública do site. Opcional: no browser, cai para `window.location.origin`. */
  get siteUrl(): string | undefined {
    return process.env.NEXT_PUBLIC_SITE_URL || undefined;
  },
};
