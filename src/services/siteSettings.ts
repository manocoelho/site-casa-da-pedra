import {
  createSupabaseBrowserClient,
  type TypedSupabaseClient,
} from "@/lib/supabase/client";
import { siteConfig } from "@/config/site";
import type { SiteSettingsData, SiteSettingsUpdate } from "@/types/siteSettings";

export const defaultSiteSettings: SiteSettingsData = {
  eyebrow: siteConfig.hero.eyebrow,
  title: siteConfig.hero.title,
  slogan: siteConfig.hero.slogan,
  cover_image_url:
    typeof siteConfig.hero.image.src === "string"
      ? siteConfig.hero.image.src
      : "/images/hero-casa-da-pedra.jpg",
  cover_image_alt: siteConfig.hero.image.alt,
  cover_position: "center 25%",
  cover_fit: "cover",
  cta_label: siteConfig.hero.cta.label,
  cta_href: siteConfig.hero.cta.href,
  highlights: siteConfig.hero.highlights,
  whatsapp: siteConfig.contact.whatsapp,
  instagram: siteConfig.contact.instagram,
  email: siteConfig.contact.email,
};

export function createSiteSettingsService(supabase: TypedSupabaseClient) {
  return {
    /**
     * Busca as configurações da página inicial com fallback para siteConfig padrão.
     */
    async getSettings(): Promise<SiteSettingsData> {
      try {
        const untypedClient = supabase as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
              };
            };
            upsert: (record: unknown) => {
              select: () => Promise<{ error: { message: string } | null }>;
            };
          };
        };

        const { data, error } = await untypedClient
          .from("site_settings")
          .select("*")
          .eq("id", "main")
          .maybeSingle();

        if (error || !data) {
          return defaultSiteSettings;
        }

        const row = data as Partial<SiteSettingsData>;

        return {
          eyebrow: row.eyebrow || defaultSiteSettings.eyebrow,
          title: row.title || defaultSiteSettings.title,
          slogan: row.slogan || defaultSiteSettings.slogan,
          cover_image_url: row.cover_image_url || defaultSiteSettings.cover_image_url,
          cover_image_alt: row.cover_image_alt || defaultSiteSettings.cover_image_alt,
          cover_position: row.cover_position || defaultSiteSettings.cover_position,
          cover_fit: row.cover_fit || defaultSiteSettings.cover_fit,
          cta_label: row.cta_label || defaultSiteSettings.cta_label,
          cta_href: row.cta_href || defaultSiteSettings.cta_href,
          highlights:
            Array.isArray(row.highlights) && row.highlights.length > 0
              ? row.highlights
              : defaultSiteSettings.highlights,
          whatsapp: row.whatsapp || defaultSiteSettings.whatsapp,
          instagram: row.instagram || defaultSiteSettings.instagram,
          email: row.email || defaultSiteSettings.email,
        };
      } catch (err) {
        console.warn("[siteSettings] Usando fallback padrão:", err);
        return defaultSiteSettings;
      }
    },

    /**
     * Atualiza os textos e imagem de capa no banco de dados.
     */
    async updateSettings(values: SiteSettingsUpdate): Promise<{ ok: boolean; error?: string }> {
      try {
        const untypedClient = supabase as unknown as {
          from: (table: string) => {
            upsert: (record: unknown) => {
              select: () => Promise<{ error: { message: string } | null }>;
            };
          };
        };

        const { error } = await untypedClient
          .from("site_settings")
          .upsert({
            id: "main",
            ...values,
            updated_at: new Date().toISOString(),
          })
          .select();

        if (error) {
          return {
            ok: false,
            error: `Erro ao salvar configurações: ${error.message}. Certifique-se de executar o script SQL de criação da tabela 'site_settings'.`,
          };
        }

        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido ao salvar.";
        return { ok: false, error: message };
      }
    },
  };
}

export type SiteSettingsService = ReturnType<typeof createSiteSettingsService>;

let browserSiteSettingsService: SiteSettingsService | null = null;

export function getBrowserSiteSettingsService(): SiteSettingsService {
  browserSiteSettingsService ??= createSiteSettingsService(createSupabaseBrowserClient());
  return browserSiteSettingsService;
}

export async function getPublicSiteSettings(): Promise<SiteSettingsData> {
  try {
    const { createSupabasePublicClient } = await import("@/lib/supabase/public");
    const service = createSiteSettingsService(createSupabasePublicClient());
    return await service.getSettings();
  } catch {
    return defaultSiteSettings;
  }
}
