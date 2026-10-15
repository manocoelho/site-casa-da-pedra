import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Termos de Uso e Condições de Hospedagem",
  description:
    "Termos e Condições Gerais de Uso do site e contratação de estadias na Casa da Pedra em Bananeiras - PB.",
};

export default function TermosDeUsoPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {/* Navegação / Breadcrumb */}
        <nav className="mb-6 text-xs text-stone-500 dark:text-stone-400">
          <Link href={ROUTES.home} className="hover:text-amber-600 dark:hover:text-amber-400">
            Início
          </Link>
          <span className="mx-2">/</span>
          <span className="text-stone-800 dark:text-stone-200">Termos de Uso</span>
        </nav>

        <header className="border-b border-stone-200 pb-8 dark:border-stone-800">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
            Regras e Condições
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
            Termos de Uso e Condições Gerais
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Última atualização: Outubro de 2026 · {siteConfig.name} ({siteConfig.location})
          </p>
        </header>

        <article className="prose prose-stone mt-8 max-w-none text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              1. Aceitação dos Termos
            </h2>
            <p className="mt-2">
              Ao acessar o site da <strong>{siteConfig.name}</strong>, realizar cadastro, enviar
              mensagens ou solicitar reservas em nossos flats, você declara ter lido, compreendido e
              concordado com os presentes <strong>Termos de Uso</strong> e com a nossa{" "}
              <Link href={ROUTES.privacidade} className="text-amber-600 underline dark:text-amber-400">
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              2. Cadastro e Responsabilidade do Usuário
            </h2>
            <p className="mt-2">
              Para solicitar reservas e interagir pelo chat, o usuário deve ser civilmente capaz (maior
              de 18 anos) e fornecer informações verídicas e completas no cadastro.
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>O login e senha são pessoais e intransferíveis;</li>
              <li>O usuário é o único responsável pelas ações realizadas em sua conta;</li>
              <li>
                Reservamo-nos o direito de suspender ou cancelar contas que violem estes termos,
                pratiquem condutas fraudulentas ou forneçam informações falsas.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              3. Solicitação de Reservas e Confirmação
            </h2>
            <p className="mt-2">
              A solicitação de reserva realizada através do site passa por validação de disponibilidade e
              contato prévio da administração para confirmação do pagamento e orientações de estadia.
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Status Pendente:</strong> A solicitação efetuada no site reserva provisoriamente
                a data até a confirmação formal com o administrador.
              </li>
              <li>
                <strong>Capacidade Máxima:</strong> Cada flat possui limite máximo de hóspedes
                estipulado em sua descrição, não sendo permitida a permanência de hóspedes adicionais
                sem autorização prévia expressa.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              4. Regras de Estadia e Convivência
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Horários:</strong> Check-in a partir das 14h00 e check-out até as 12h00
                (horários diferenciados sujeitos à disponibilidade prévia).
              </li>
              <li>
                <strong>Clima de Serra e Silêncio:</strong> A Casa da Pedra preza pela tranquilidade e
                o sossego da serra. É proibido som abusivo em qualquer horário e deve ser respeitado o
                silêncio das 22h00 às 08h00.
              </li>
              <li>
                <strong>Conservação do Imóvel:</strong> O hóspede deve zelar pelos móveis, utensílios,
                eletrodomésticos e estrutura do flat durante sua estadia.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              5. Política de Cancelamento
            </h2>
            <p className="mt-2">
              Cancelamentos solicitados com mais de 7 (sete) dias de antecedência do check-in ou no
              prazo de arrependimento legal de até 7 dias da compra online têm direito a reembolso
              integral. Demais condições específicas serão combinadas diretamente com a administração
              no ato da confirmação da reserva.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              6. Proteção de Dados (LGPD)
            </h2>
            <p className="mt-2">
              O tratamento dos dados pessoais coletados neste site segue rigorosamente a Lei Geral de
              Proteção de Dados (Lei nº 13.709/2018). Para maiores informações sobre como seus dados são
              utilizados, consulte nossa{" "}
              <Link href={ROUTES.privacidade} className="text-amber-600 underline dark:text-amber-400">
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              7. Legislação Aplicável e Foro
            </h2>
            <p className="mt-2">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir
              quaisquer controvérsias oriundas deste termo ou da hospedagem, fica eleito o Foro da
              Comarca de Bananeiras, Estado da Paraíba.
            </p>
          </section>
        </article>
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
