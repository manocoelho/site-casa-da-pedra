import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/HeroSection";
import { FlatList } from "@/components/flats/FlatList";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/config/site";
import { getFeaturedFlats } from "@/services/flats.server";
import { getPublicSiteSettings } from "@/services/siteSettings";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} · Flats em ${siteConfig.location}` },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/images/hero-casa-da-pedra.jpg"],
    locale: "pt_BR",
    type: "website",
  },
};

export const instant = false;

/**
 * Landing page (Server Component).
 * Responsável por buscar os flats e as configurações dinâmicas da página inicial.
 */
export default async function Home() {
  const [flats, settings] = await Promise.all([
    getFeaturedFlats(12),
    getPublicSiteSettings(),
  ]);

  const heroData = {
    eyebrow: settings.eyebrow,
    title: settings.title,
    slogan: settings.slogan,
    image: {
      src: settings.cover_image_url,
      alt: settings.cover_image_alt,
      position: settings.cover_position,
      fit: settings.cover_fit,
    },
    cta: {
      label: settings.cta_label,
      href: settings.cta_href,
    },
    highlights: settings.highlights,
  };

  const contactData = {
    whatsapp: settings.whatsapp,
    instagram: settings.instagram,
    email: settings.email,
  };

  return (
    <>
      <main className="flex flex-1 flex-col">
        <HeroSection {...heroData} />
        <FlatList
          flats={flats}
          whatsapp={contactData.whatsapp}
          sectionTag={settings.flats_section_tag}
          sectionTitle={settings.flats_section_title}
          sectionSubtitle={settings.flats_section_subtitle}
        />
      </main>
      <Footer
        name={settings.title}
        location={settings.eyebrow}
        description={settings.slogan}
        contact={contactData}
      />
    </>
  );
}
