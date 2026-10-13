import Link from "next/link";
import type { SiteConfig } from "@/config/site";
import { InstagramIcon, MailIcon, MapPinIcon, WhatsAppIcon } from "@/components/ui/icons";
import { buildInstagramUrl, buildWhatsAppUrl } from "@/lib/contact";
import { ROUTES } from "@/lib/routes";

type FooterProps = Pick<SiteConfig, "name" | "location" | "description" | "contact">;

export function Footer({ name, location, description, contact }: FooterProps) {
  const contactLinks = [
    {
      label: "WhatsApp",
      href: buildWhatsAppUrl(contact.whatsapp, `Olá! Vim pelo site da ${name}.`),
      Icon: WhatsAppIcon,
      external: true,
    },
    {
      label: `@${contact.instagram}`,
      href: buildInstagramUrl(contact.instagram),
      Icon: InstagramIcon,
      external: true,
    },
    { label: contact.email, href: `mailto:${contact.email}`, Icon: MailIcon, external: false },
  ];

  return (
    <footer id="contato" className="bg-stone-950 text-stone-300">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-white">{name}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-300">
            <MapPinIcon className="size-4" />
            {location}
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-stone-400">{description}</p>
        </div>

        <nav aria-label="Navegação do rodapé">
          <p className="text-sm font-semibold uppercase tracking-wider text-white">Navegue</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li><a href="#flats" className="hover:text-white">Nossos flats</a></li>
            <li><Link href={ROUTES.login} className="hover:text-white">Entrar</Link></li>
            <li><Link href={ROUTES.cadastro} className="hover:text-white">Criar conta</Link></li>
          </ul>
        </nav>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-white">Contato</p>
          <ul className="mt-4 space-y-3 text-sm">
            {contactLinks.map(({ label, href, Icon, external }) => (
              <li key={href}>
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <Icon className="size-4" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-stone-800">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-stone-500 sm:px-6">
          © {name} · {location}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
