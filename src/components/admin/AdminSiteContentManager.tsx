"use client";

import { useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { CheckIcon, ImageIcon, MapPinIcon, PlusIcon } from "@/components/ui/icons";
import { getBrowserSiteSettingsService } from "@/services/siteSettings";
import { getBrowserStorageService, validatePhotoFile } from "@/services/storage";
import { revalidateSiteContent } from "@/app/admin/actions";
import type { SiteSettingsData } from "@/types/siteSettings";

interface AdminSiteContentManagerProps {
  initialSettings: SiteSettingsData;
  className?: string;
}

export function AdminSiteContentManager({
  initialSettings,
  className = "",
}: AdminSiteContentManagerProps) {
  const [settings, setSettings] = useState<SiteSettingsData>(initialSettings);
  const [newHighlight, setNewHighlight] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manipulação de imagem de capa
  async function handleCoverFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Arquivo de foto inválido.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUploadingCover(true);
    setUploadProgress(10);

    try {
      const storage = getBrowserStorageService();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const storagePath = `hero/capa-${Date.now()}.${ext}`;

      const result = await storage.uploadFile(file, storagePath, {
        onProgress: (p) => setUploadProgress(p),
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      setSettings((prev) => ({
        ...prev,
        cover_image_url: result.data.publicUrl,
      }));

      setSuccessMessage("Nova foto de capa carregada! Lembre-se de clicar em 'Salvar Alterações' abaixo.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao enviar foto de capa.");
    } finally {
      setIsUploadingCover(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  }

  function handleResetCover() {
    setSettings((prev) => ({
      ...prev,
      cover_image_url: "/images/hero-casa-da-pedra.jpg",
    }));
    setSuccessMessage("Foto de capa resetada para a padrão original.");
  }

  // Adicionar e remover destaques/tags
  function handleAddHighlight() {
    const trimmed = newHighlight.trim();
    if (!trimmed) return;
    if (settings.highlights.includes(trimmed)) {
      setErrorMessage("Este destaque já foi adicionado.");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      highlights: [...prev.highlights, trimmed],
    }));
    setNewHighlight("");
  }

  function handleRemoveHighlight(indexToRemove: number) {
    setSettings((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((_, idx) => idx !== indexToRemove),
    }));
  }

  // Salvar no banco de dados
  async function handleSaveSettings() {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setWarningMessage(null);

    try {
      const service = getBrowserSiteSettingsService();
      const res = await service.updateSettings(settings);

      if (!res.ok) {
        throw new Error(res.error || "Não foi possível salvar no banco de dados.");
      }

      await revalidateSiteContent();
      if (res.warning) {
        setWarningMessage(res.warning);
      } else {
        setSuccessMessage("Configurações e textos da página inicial atualizados com sucesso!");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={`flex flex-col gap-8 pb-12 ${className}`}>
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50">
          Personalização da Página Inicial
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Altere a foto da capa principal, títulos, subtítulos, botões e contatos institucionais do site.
        </p>
      </div>

      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      {warningMessage && (
        <div className="flex flex-col gap-2">
          <Alert variant="warning">{warningMessage}</Alert>
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-bold">Comando para habilitar o salvamento de todas as opções no banco:</p>
            <p className="mt-1 text-stone-600 dark:text-stone-300">
              Copie o comando SQL abaixo e execute no <strong>SQL Editor</strong> do painel do seu Supabase:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-stone-900 p-3 font-mono text-[11px] text-amber-300 select-all">
              {`ALTER TABLE public.site_settings\n  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT 'center 25%',\n  ADD COLUMN IF NOT EXISTS cover_fit text NOT NULL DEFAULT 'cover',\n  ADD COLUMN IF NOT EXISTS flats_section_tag text NOT NULL DEFAULT 'Hospedagem',\n  ADD COLUMN IF NOT EXISTS flats_section_title text NOT NULL DEFAULT 'Escolha o seu flat',\n  ADD COLUMN IF NOT EXISTS flats_section_subtitle text NOT NULL DEFAULT 'Espaços completos e aconchegantes para viver Bananeiras no seu ritmo — do café com vista para a serra às noites frias ao pé da fogueira.';`}
            </pre>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="flex flex-col gap-2">
          <Alert variant="error">{errorMessage}</Alert>
          {(errorMessage.includes("site_settings") ||
            errorMessage.includes("cover_fit") ||
            errorMessage.includes("cover_position") ||
            errorMessage.includes("flats_section")) && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-bold">Comando SQL para atualizar a tabela no Supabase:</p>
              <p className="mt-1 text-stone-600 dark:text-stone-300">
                Execute o comando abaixo no <strong>SQL Editor</strong> do painel do seu Supabase:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-stone-900 p-3 font-mono text-[11px] text-amber-300 select-all">
                {`ALTER TABLE public.site_settings\n  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT 'center 25%',\n  ADD COLUMN IF NOT EXISTS cover_fit text NOT NULL DEFAULT 'cover',\n  ADD COLUMN IF NOT EXISTS flats_section_tag text NOT NULL DEFAULT 'Hospedagem',\n  ADD COLUMN IF NOT EXISTS flats_section_title text NOT NULL DEFAULT 'Escolha o seu flat',\n  ADD COLUMN IF NOT EXISTS flats_section_subtitle text NOT NULL DEFAULT 'Espaços completos e aconchegantes para viver Bananeiras no seu ritmo — do café com vista para a serra às noites frias ao pé da fogueira.';`}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Grid com Formulário de Edição e Prévia ao Vivo */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Coluna de Configuração (7 colunas) */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          {/* Seção 1: Foto da Capa */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-50">
              <ImageIcon className="size-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-base font-bold">Foto da Capa (Hero Cover)</h3>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              A imagem de fundo com efeito escurecido exibida no topo da página inicial (JPG, PNG, WebP até 5MB).
            </p>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Thumbnail da capa */}
              <div className="relative h-32 w-full sm:w-48 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-800">
                <Image
                  src={settings.cover_image_url}
                  alt="Capa da Home"
                  fill
                  unoptimized
                  className="object-cover"
                  style={{ objectPosition: settings.cover_position || "center 25%" }}
                />
              </div>

              {/* Ações de Upload */}
              <div className="flex flex-1 flex-col gap-2">
                <label className="relative inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-amber-500 px-4 text-xs font-semibold text-stone-950 transition hover:bg-amber-400">
                  <span>{isUploadingCover ? "Enviando imagem..." : "Substituir foto de capa"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleCoverFileChange}
                    disabled={isUploadingCover}
                    className="sr-only"
                  />
                </label>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetCover}
                  className="text-xs"
                >
                  Restaurar foto padrão
                </Button>

                {isUploadingCover && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                      <div
                        className="h-full bg-amber-500 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-stone-500">{uploadProgress}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ajuste de Enquadramento e Foco */}
            <div className="mt-5 border-t border-stone-100 pt-4 dark:border-stone-800">
              <label className="text-xs font-semibold text-stone-900 uppercase tracking-wider dark:text-stone-100">
                Foco do Enquadramento
              </label>
              <p className="mt-0.5 text-xs text-stone-500">
                Evita cortes indesejados da casa e da pedra em telas maiores de computador e celular.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { id: "center 20%", label: "Topo (Casa & Pedra)" },
                  { id: "center 35%", label: "Meio" },
                  { id: "center 70%", label: "Base (Portão)" },
                  { id: "center center", label: "Centralizado" },
                ].map((pos) => {
                  const isSelected = (settings.cover_position || "center 25%") === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, cover_position: pos.id }))}
                      className={`rounded-xl border p-2 text-center text-xs font-medium transition ${
                        isSelected
                          ? "border-amber-500 bg-amber-50 text-amber-950 font-bold dark:bg-amber-950/40 dark:text-amber-200"
                          : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
                      }`}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>

              {/* Modo de exibição: preencher vs foto completa */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                  Estilo:
                </span>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, cover_fit: "cover" }))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    (settings.cover_fit || "cover") === "cover"
                      ? "bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
                  }`}
                >
                  Preencher tela (Imersivo)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, cover_fit: "contain" }))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    settings.cover_fit === "contain"
                      ? "bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
                  }`}
                >
                  Foto inteira (Sem cortes)
                </button>
              </div>
            </div>
          </div>

          {/* Seção 2: Textos Principais */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-50">
              Textos da Seção Principal
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Personalize o título, slogan e etiqueta exibidos sobre a capa.
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <TextField
                label="Etiqueta / Localização"
                name="eyebrow"
                value={settings.eyebrow}
                onChange={(e) => setSettings((s) => ({ ...s, eyebrow: e.target.value }))}
                placeholder="Ex.: Bananeiras · Paraíba"
              />

              <TextField
                label="Título Principal"
                name="title"
                value={settings.title}
                onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
                placeholder="Ex.: Casa da Pedra"
              />

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="home-slogan"
                  className="text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Slogan / Subtítulo
                </label>
                <textarea
                  id="home-slogan"
                  rows={3}
                  value={settings.slogan}
                  onChange={(e) => setSettings((s) => ({ ...s, slogan: e.target.value }))}
                  className="rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-hidden focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  placeholder="Ex.: Seu refúgio de pedra e aconchego no friozinho da serra paraibana."
                />
              </div>

              <TextField
                label="Texto do Botão de Ação"
                name="cta_label"
                value={settings.cta_label}
                onChange={(e) => setSettings((s) => ({ ...s, cta_label: e.target.value }))}
                placeholder="Ex.: Ver Disponibilidade"
              />

              {/* Gerenciamento de Tags / Destaques */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Destaques (Itens abaixo do botão)
                </label>
                <div className="flex flex-wrap gap-2">
                  {settings.highlights.map((item, idx) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlight(idx)}
                        className="text-stone-400 hover:text-red-500"
                        title="Remover destaque"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddHighlight();
                      }
                    }}
                    placeholder="Adicionar novo diferencial..."
                    className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-hidden dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddHighlight}
                    leftIcon={<PlusIcon className="size-3.5" />}
                    className="text-xs"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 3: Textos da Seção de Flats (Hospedagem) */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-50">
              Textos da Seção dos Flats
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Personalize o título, subtítulo e etiqueta exibidos logo acima da listagem de flats.
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <TextField
                label="Etiqueta Superior (Categoria)"
                name="flats_section_tag"
                value={settings.flats_section_tag || ""}
                onChange={(e) => setSettings((s) => ({ ...s, flats_section_tag: e.target.value }))}
                placeholder="Ex.: Hospedagem"
              />

              <TextField
                label="Título da Seção de Flats"
                name="flats_section_title"
                value={settings.flats_section_title || ""}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, flats_section_title: e.target.value }))
                }
                placeholder="Ex.: Escolha o seu flat"
              />

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="flats-subtitle"
                  className="text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Descrição / Subtítulo da Seção
                </label>
                <textarea
                  id="flats-subtitle"
                  rows={3}
                  value={settings.flats_section_subtitle || ""}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, flats_section_subtitle: e.target.value }))
                  }
                  className="rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-hidden focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  placeholder="Ex.: Espaços completos e aconchegantes para viver Bananeiras no seu ritmo — do café com vista para a serra às noites frias ao pé da fogueira."
                />
              </div>

              {/* Prévia da Seção de Flats */}
              <div className="mt-1 rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Prévia desta seção
                </span>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                  {settings.flats_section_tag || "Hospedagem"}
                </p>
                <h4 className="mt-1 text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
                  {settings.flats_section_title || "Escolha o seu flat"}
                </h4>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {settings.flats_section_subtitle ||
                    "Espaços completos e aconchegantes para viver Bananeiras no seu ritmo..."}
                </p>
              </div>
            </div>
          </div>

          {/* Seção 4: Informações de Contato e Redes */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-50">
              Contatos e Redes Sociais
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Utilizados no rodapé e botões de contato direto.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="WhatsApp (com DDI e DDD)"
                name="whatsapp"
                value={settings.whatsapp}
                onChange={(e) => setSettings((s) => ({ ...s, whatsapp: e.target.value }))}
                placeholder="5583900000000"
              />

              <TextField
                label="Instagram (usuário)"
                name="instagram"
                value={settings.instagram}
                onChange={(e) => setSettings((s) => ({ ...s, instagram: e.target.value }))}
                placeholder="flatcasadapedra"
              />

              <div className="sm:col-span-2">
                <TextField
                  label="E-mail de Contato"
                  name="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
                  placeholder="contato@casadapedra.com.br"
                />
              </div>
            </div>
          </div>

          {/* Botão de Salvar */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="primary"
              isLoading={isSaving}
              onClick={handleSaveSettings}
              leftIcon={<CheckIcon className="size-4" />}
            >
              Salvar Alterações da Página Inicial
            </Button>
          </div>
        </div>

        {/* Coluna da Prévia Visual ao Vivo (5 colunas) */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="sticky top-20 rounded-3xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider dark:text-stone-100">
                Prévia ao Vivo
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                Simulador da Home
              </span>
            </div>

            {/* Mockup da Hero Section */}
            <div className="relative isolate mt-4 h-[460px] w-full overflow-hidden rounded-2xl bg-stone-950 flex flex-col justify-end p-6 text-white shadow-inner">
              {/* Imagem de Capa com overlays */}
              {settings.cover_fit === "contain" ? (
                <>
                  <Image
                    src={settings.cover_image_url}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover blur-lg opacity-40"
                  />
                  <Image
                    src={settings.cover_image_url}
                    alt="Prévia da Capa"
                    fill
                    unoptimized
                    className="object-contain object-center"
                  />
                </>
              ) : (
                <Image
                  src={settings.cover_image_url}
                  alt="Prévia da Capa"
                  fill
                  unoptimized
                  className="object-cover transition-all duration-300"
                  style={{ objectPosition: settings.cover_position || "center 25%" }}
                />
              )}

              {/* Overlays direcionados para leitura sem ofuscar a foto */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/25 to-transparent pointer-events-none" />
              <div className="absolute inset-y-0 left-0 w-4/5 bg-gradient-to-r from-stone-950/80 via-stone-950/20 to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col">
                {/* Eyebrow e Pino de Localização */}
                <div className="flex flex-col items-start gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200 backdrop-blur">
                    <MapPinIcon className="size-3" />
                    {settings.eyebrow || "Localização"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-stone-950/80 px-2.5 py-0.5 text-[10px] text-stone-200">
                    <MapPinIcon className="size-2.5 text-amber-400" />
                    R. Antonio Maia, 54 · Bananeiras, PB
                  </span>
                </div>

                {/* Título */}
                <h4 className="mt-3 text-2xl font-bold tracking-tight text-white leading-tight">
                  {settings.title || "Título da Casa"}
                </h4>

                {/* Slogan */}
                <p className="mt-2 text-xs text-stone-200 line-clamp-3 leading-relaxed">
                  {settings.slogan || "Slogan e subtítulo da Casa da Pedra..."}
                </p>

                {/* Botão */}
                <div className="mt-4 flex flex-col gap-3">
                  <div className="inline-flex h-9 w-fit items-center justify-center rounded-full bg-amber-500 px-4 text-xs font-bold text-stone-950 shadow-md">
                    {settings.cta_label || "Ver Disponibilidade"}
                  </div>

                  {/* Highlights */}
                  <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-stone-300">
                    {settings.highlights.slice(0, 3).map((h) => (
                      <li key={h} className="flex items-center gap-1">
                        <span className="size-1 rounded-full bg-amber-400" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-stone-500">
              As alterações salvas são refletidas instantaneamente na página inicial pública.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
