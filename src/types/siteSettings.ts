export interface SiteSettingsData {
  eyebrow: string;
  title: string;
  slogan: string;
  cover_image_url: string;
  cover_image_alt: string;
  cta_label: string;
  cta_href: string;
  highlights: string[];
  whatsapp: string;
  instagram: string;
  email: string;
}

export type SiteSettingsUpdate = Partial<SiteSettingsData>;
