import type { StaticImageData } from "next/image";
import heroImage from "../../public/images/hero-casa-da-pedra.jpg";

/**
 * Conteúdo institucional do site (textos, contatos, imagens fixas).
 * Centralizado aqui para que os componentes de UI recebam tudo por props.
 */

export interface HeroContent {
  eyebrow: string;
  title: string;
  slogan: string;
  image: { src: StaticImageData | string; alt: string };
  cta: { label: string; href: string };
  highlights: string[];
}

export interface ContactInfo {
  /** Somente dígitos, com DDI e DDD. Ex.: 5583999999999 */
  whatsapp: string;
  instagram: string;
  email: string;
}

export interface SiteConfig {
  name: string;
  location: string;
  description: string;
  hero: HeroContent;
  contact: ContactInfo;
}

export const siteConfig: SiteConfig = {
  name: "Casa da Pedra",
  location: "Bananeiras, Paraíba",
  description:
    "Flats aconchegantes em meio às serras de Bananeiras, no Brejo Paraibano: clima ameno, natureza e o charme da cidade histórica.",
  hero: {
    eyebrow: "Bananeiras · Paraíba",
    title: "Casa da Pedra",
    slogan: "Seu refúgio de pedra e aconchego no friozinho da serra paraibana.",
    image: {
      // Imagem provisória — substitua por uma foto real do local.
      src: heroImage,
      alt: "Casa de pedra com varandas de madeira em meio à mata e às serras de Bananeiras ao pôr do sol",
    },
    cta: { label: "Ver Disponibilidade", href: "#flats" },
    highlights: ["Clima de serra", "Vista para as montanhas", "Perto do centro histórico"],
  },
  // TODO: substituir pelos contatos reais.
  contact: {
    whatsapp: "5583999262031",
    instagram: "flatcasadapedra",
    email: "contato@casadapedra.com.br",
  },
};
