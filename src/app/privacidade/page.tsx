import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Política de Privacidade e Proteção de Dados (LGPD)",
  description:
    "Conheça nossa Política de Privacidade em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).",
};

export default function PoliticaPrivacidadePage() {
  return (
    <>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {/* Navegação / Breadcrumb */}
        <nav className="mb-6 text-xs text-stone-500 dark:text-stone-400">
          <Link href={ROUTES.home} className="hover:text-amber-600 dark:hover:text-amber-400">
            Início
          </Link>
          <span className="mx-2">/</span>
          <span className="text-stone-800 dark:text-stone-200">Política de Privacidade</span>
        </nav>

        <header className="border-b border-stone-200 pb-8 dark:border-stone-800">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
            Lei nº 13.709/2018 (LGPD)
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
            Política de Privacidade e Proteção de Dados
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Última atualização: Outubro de 2026 · {siteConfig.name} ({siteConfig.location})
          </p>
        </header>

        <article className="prose prose-stone mt-8 max-w-none text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              1. Visão Geral e Compromisso com a Privacidade
            </h2>
            <p className="mt-2">
              A <strong>{siteConfig.name}</strong>, situada em {siteConfig.location}, tem o firme
              compromisso de respeitar e resguardar a privacidade e a proteção dos dados pessoais de
              seus hóspedes, usuários e visitantes, em estrita conformidade com a{" "}
              <strong>Lei Geral de Proteção de Dados Pessoais (LGPD – Lei Federal nº 13.709/2018)</strong>{" "}
              e o <strong>Marco Civil da Internet (Lei Federal nº 12.965/2014)</strong>.
            </p>
            <p className="mt-2">
              Esta política explica de forma clara e transparente como coletamos, utilizamos,
              armazenamos, compartilhamos e protegemos seus dados pessoais quando você navega em nosso
              site, cria uma conta, reserva nossos flats ou conversa com nossa administração.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              2. Dados Pessoais Coletados e Finalidades
            </h2>
            <p className="mt-2">
              Coletamos apenas os dados estritamente necessários para a prestação dos nossos serviços
              de hospedagem e suporte:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Dados de Cadastro e Autenticação:</strong> Nome completo, endereço de e-mail e
                senha criptografada.
                <br />
                <em>Finalidade:</em> Criação de conta individual, autenticação segura e identificação
                do titular (Base Legal: Art. 7º, V da LGPD – Execução de Contrato).
              </li>
              <li>
                <strong>Dados de Reserva de Estadia:</strong> Flat selecionado, datas de check-in e
                check-out, quantidade de hóspedes e histórico de estadias.
                <br />
                <em>Finalidade:</em> Processamento da solicitação de reserva, controle de ocupação e
                comunicação prévia sobre sua hospedagem (Base Legal: Art. 7º, V da LGPD – Execução de
                Contrato).
              </li>
              <li>
                <strong>Atendimento e Mensagens no Chat:</strong> Mensagens trocadas entre você e nossa
                equipe através da plataforma de chat.
                <br />
                <em>Finalidade:</em> Esclarecimento de dúvidas sobre os flats, informações turísticas de
                Bananeiras e suporte durante a estadia (Base Legal: Art. 7º, V e IX da LGPD – Execução de
                Contrato e Legítimo Interesse).
              </li>
              <li>
                <strong>Avaliações e Feedbacks:</strong> Nota por estrelas e comentários voluntários
                sobre sua experiência na hospedagem.
                <br />
                <em>Finalidade:</em> Aprimoramento da qualidade dos nossos serviços e exibição pública
                de avaliações com seu nome de usuário (Base Legal: Art. 7º, I da LGPD – Consentimento).
              </li>
              <li>
                <strong>Dados de Acesso e Conexão:</strong> Endereço IP, data, horário e dados
                técnicos da sessão.
                <br />
                <em>Finalidade:</em> Cumprimento de obrigação legal de guarda de registros de acesso a
                aplicações de internet (Base Legal: Art. 7º, II da LGPD c/c Art. 15 da Lei nº 12.965/2014
                – Marco Civil da Internet).
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              3. Uso de Cookies e Tecnologias de Sessão
            </h2>
            <p className="mt-2">
              Utilizamos exclusivamente <strong>cookies técnicos estritamente necessários</strong> para:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Manter você conectado à sua conta com segurança durante a navegação;</li>
              <li>Prevenir fraudes e ataques automatizados (CSRF/XSS);</li>
              <li>Lembrar sua preferência de consentimento de privacidade.</li>
            </ul>
            <p className="mt-2">
              Não utilizamos cookies de terceiros para rastreamento publicitário invasivo ou venda de
              perfil de consumo.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              4. Compartilhamento de Dados com Terceiros
            </h2>
            <p className="mt-2">
              A <strong>{siteConfig.name} não vende, não aluga e não comercializa</strong> dados
              pessoais em hipótese alguma. O compartilhamento ocorre apenas com prestadores de
              serviços de infraestrutura essenciais:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Supabase Inc.:</strong> Provedor de banco de dados e autenticação em nuvem, com
                infraestrutura segura, criptografia TLS/SSL e isolamento de dados.
              </li>
              <li>
                <strong>Vercel Inc.:</strong> Provedor de hospedagem da aplicação web.
              </li>
              <li>
                <strong>Autoridades Judiciais ou Administrativas:</strong> Apenas mediante ordem
                judicial ou obrigação legal expressa.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              5. Segurança da Informação e Armazenamento
            </h2>
            <p className="mt-2">
              Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra
              acessos não autorizados, destruição, perda ou alteração acidental:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Tráfego 100% criptografado através de protocolo HTTPS / TLS;</li>
              <li>Senhas de usuários armazenadas com algoritmo de hash criptográfico unidirecional;</li>
              <li>
                Políticas de segurança em nível de linha no banco de dados (Row Level Security - RLS),
                garantindo que cada usuário acesse unicamente seus próprios dados;
              </li>
              <li>Acesso restrito ao painel administrativo exclusivo para administradores autorizados.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              6. Seus Direitos como Titular de Dados (Art. 18 da LGPD)
            </h2>
            <p className="mt-2">
              Conforme previsto no Art. 18 da Lei Geral de Proteção de Dados, você tem o direito de, a
              qualquer momento e mediante requisição gratuita:
            </p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5">
              <li>Confirmar a existência de tratamento dos seus dados;</li>
              <li>Acessar os dados pessoais que mantemos a seu respeito;</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li>
                Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em
                desconformidade com a LGPD;
              </li>
              <li>Solicitar a portabilidade dos seus dados para outro prestador de serviços;</li>
              <li>
                Solicitar a eliminação dos dados pessoais tratados com base no seu consentimento;
              </li>
              <li>Revogar o seu consentimento a qualquer momento;</li>
              <li>Obter informações sobre as entidades públicas e privadas com as quais compartilhamos dados.</li>
            </ol>
          </section>

          <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-6 dark:border-amber-900/50 dark:bg-amber-950/30">
            <h2 className="text-lg font-bold text-amber-950 dark:text-amber-200">
              7. Canal de Contato do Encarregado de Dados (DPO)
            </h2>
            <p className="mt-2 text-stone-700 dark:text-stone-300">
              Para exercer qualquer um dos seus direitos, tirar dúvidas sobre esta política ou solicitar
              a exclusão da sua conta e dados pessoais, entre em contato diretamente com o nosso
              Encarregado de Proteção de Dados através dos canais oficiais:
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-stone-900 dark:text-stone-100">
              <p>
                <strong>E-mail de Privacidade:</strong>{" "}
                <a
                  href={`mailto:${siteConfig.contact.email}?subject=Solicitacao%20LGPD%20-%20Exercicio%20de%20Direitos`}
                  className="text-amber-700 underline dark:text-amber-400"
                >
                  {siteConfig.contact.email}
                </a>
              </p>
              <p>
                <strong>WhatsApp da Administração:</strong>{" "}
                <a
                  href={`https://wa.me/${siteConfig.contact.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-700 underline dark:text-amber-400"
                >
                  +{siteConfig.contact.whatsapp}
                </a>
              </p>
              <p>
                <strong>Localização:</strong> {siteConfig.name} · {siteConfig.location}
              </p>
            </div>
            <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
              * Suas solicitações serão respondidas com agilidade, respeitando os prazos legais da
              Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              8. Alterações nesta Política de Privacidade
            </h2>
            <p className="mt-2">
              Poderemos atualizar esta Política de Privacidade periodicamente para refletir melhorias em
              nossas práticas ou atender a novos requisitos regulatórios. Quaisquer alterações
              substanciais serão publicadas nesta página com a respectiva data de revisão.
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
