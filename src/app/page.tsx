import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/HeroSection";
import { FlatList } from "@/components/flats/FlatList";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/config/site";
import { getFeaturedFlats } from "@/services/flats.server";

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

/**
 * Landing page (Server Component).
 * Responsável apenas por buscar os dados e repassá-los como props aos componentes.
 */
export default async function Home() {
  const flats = await getFeaturedFlats(2);

  return (
    <>
      <main className="flex flex-1 flex-col">
        <HeroSection {...siteConfig.hero} />
        <FlatList flats={flats} whatsapp={siteConfig.contact.whatsapp} />
      </main>
      <Footer
        name={siteConfig.name}
        location={siteConfig.location}
        description={siteConfig.description}
        contact={siteConfig.contact}
      />
    </>
  );
}
