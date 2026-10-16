"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { detectPlatformFromUrl } from "@/lib/ical";
import { getBrowserIcalService } from "@/services/ical";
import type { FlatWithPhotos } from "@/types/entities";
import type {
  ExternalCalendarBlock,
  FlatIcalFeed,
  IcalPlatform,
} from "@/types/ical";

interface AdminIcalManagerProps {
  flats: FlatWithPhotos[];
}

const PLATFORM_LABELS: Record<IcalPlatform, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  outro: "Outra Plataforma",
};

const PLATFORM_BADGE_STYLES: Record<IcalPlatform, string> = {
  airbnb:
    "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  booking:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  outro:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
};

export function AdminIcalManager({ flats }: AdminIcalManagerProps) {
  const [selectedFlatId, setSelectedFlatId] = useState<string>(flats[0]?.id || "");
  const [feeds, setFeeds] = useState<FlatIcalFeed[]>([]);
  const [blocks, setBlocks] = useState<ExternalCalendarBlock[]>([]);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);

  // Estado do formulário de novo calendário
  const [plataforma, setPlataforma] = useState<IcalPlatform>("airbnb");
  const [nome, setNome] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Feedbacks visuais
  const [copiedFlatId, setCopiedFlatId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const activeFlat = useMemo(
    () => flats.find((f) => f.id === selectedFlatId) || flats[0] || null,
    [flats, selectedFlatId],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const icalService = getBrowserIcalService();
      const [feedsResult, allBlocks] = await Promise.all([
        icalService.listFeeds(),
        icalService.listExternalBlocks(),
      ]);

      setFeeds(feedsResult.feeds);
      setSchemaMissing(Boolean(feedsResult.schemaMissing));
      setBlocks(allBlocks);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtra feeds e bloqueios do flat selecionado
  const activeFlatFeeds = useMemo(
    () => feeds.filter((f) => f.flat_id === activeFlat?.id),
    [feeds, activeFlat],
  );

  const activeFlatBlocks = useMemo(
    () => blocks.filter((b) => b.flat_id === activeFlat?.id),
    [blocks, activeFlat],
  );

  // Monta a URL pública de exportação .ics do flat ativo
  const exportUrl = useMemo(() => {
    if (!activeFlat) return "";
    const baseUrl =
      typeof window !== "undefined" &&
      !window.location.origin.includes("localhost")
        ? window.location.origin
        : "https://site-casa-da-pedra.vercel.app";
    return `${baseUrl}/api/ical/${activeFlat.id}.ics`;
  }, [activeFlat]);

  async function handleCopyExportUrl() {
    if (!activeFlat || !exportUrl) return;
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopiedFlatId(activeFlat.id);
      setTimeout(() => setCopiedFlatId(null), 3000);
    } catch {
      // Fallback
    }
  }

  function handleUrlChange(value: string) {
    setIcalUrl(value);
    if (value.trim()) {
      const detected = detectPlatformFromUrl(value);
      if (detected !== "outro") {
        setPlataforma(detected);
      }
    }
  }

  async function handleAddFeed(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFlat) return;

    setFeedbackMsg(null);
    setIsAdding(true);

    try {
      const icalService = getBrowserIcalService();
      const defaultName = PLATFORM_LABELS[plataforma];
      const addRes = await icalService.addFeed({
        flatId: activeFlat.id,
        plataforma,
        nome: nome.trim() || defaultName,
        icalUrl,
      });

      if (!addRes.ok || !addRes.data) {
        setFeedbackMsg({
          type: "error",
          text: addRes.error || "Não foi possível adicionar o calendário.",
        });
        return;
      }

      setIcalUrl("");
      setNome("");

      // Sincroniza imediatamente o feed recém-adicionado
      const syncRes = await icalService.triggerSync({
        feedId: addRes.data.id,
        force: true,
      });

      await loadData();

      const feedOutcome = syncRes.results[0];
      if (feedOutcome && !feedOutcome.ok) {
        setFeedbackMsg({
          type: "error",
          text: `Calendário salvo, porém houve falha ao buscar o link .ics: ${feedOutcome.error}. Verifique se a URL foi copiada corretamente da plataforma.`,
        });
      } else {
        const count = feedOutcome?.eventsCount ?? 0;
        setFeedbackMsg({
          type: "success",
          text: `Calendário ${defaultName} conectado e sincronizado com sucesso! (${count} ${count === 1 ? "período bloqueado importado" : "períodos bloqueados importados"}).`,
        });
      }
    } finally {
      setIsAdding(false);
    }
  }

  async function handleSyncFeed(feedId: string) {
    setFeedbackMsg(null);
    setSyncingFeedId(feedId);
    try {
      const icalService = getBrowserIcalService();
      const res = await icalService.triggerSync({ feedId, force: true });
      await loadData();

      const item = res.results[0];
      if (!res.ok || (item && !item.ok)) {
        setFeedbackMsg({
          type: "error",
          text: item?.error || res.error || "Erro ao sincronizar calendário.",
        });
      } else {
        setFeedbackMsg({
          type: "success",
          text: `Calendário "${item?.nome || "Externo"}" atualizado! (${item?.eventsCount ?? 0} bloqueios vigentes).`,
        });
      }
    } finally {
      setSyncingFeedId(null);
    }
  }

  async function handleSyncAll() {
    setFeedbackMsg(null);
    setIsSyncing(true);
    try {
      const icalService = getBrowserIcalService();
      const res = await icalService.triggerSync({ force: true });
      await loadData();

      if (!res.ok) {
        setFeedbackMsg({
          type: "error",
          text: res.error || "Erro ao sincronizar calendários.",
        });
        return;
      }

      const failed = res.results.filter((r) => !r.ok);
      const totalEvents = res.results.reduce((acc, r) => acc + r.eventsCount, 0);

      if (failed.length > 0) {
        setFeedbackMsg({
          type: "error",
          text: `Sincronização concluída com ${failed.length} erro(s): ${failed.map((f) => `${f.nome} (${f.error})`).join("; ")}`,
        });
      } else {
        setFeedbackMsg({
          type: "success",
          text: `Todos os ${res.results.length} calendários foram sincronizados com sucesso! (${totalEvents} bloqueios ativos no total).`,
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDeleteFeed(feed: FlatIcalFeed) {
    if (
      !window.confirm(
        `Deseja remover a sincronização com "${feed.nome}"? Os bloqueios importados deste link serão liberados.`,
      )
    ) {
      return;
    }

    setFeedbackMsg(null);
    const icalService = getBrowserIcalService();
    const res = await icalService.deleteFeed(feed.id);
    if (!res.ok) {
      setFeedbackMsg({
        type: "error",
        text: res.error || "Erro ao remover calendário.",
      });
      return;
    }

    await loadData();
    setFeedbackMsg({
      type: "success",
      text: `Calendário "${feed.nome}" removido com sucesso.`,
    });
  }

  if (flats.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 p-12 text-center text-stone-500 dark:border-stone-800">
        Cadastre pelo menos um flat na aba &ldquo;Flats & Fotos&rdquo; para configurar a sincronização de calendários.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Banner Explicativo + Botão Sincronizar Todos */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
              Anti-Overbooking (iCal .ics)
            </span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-50">
            Sincronização com Airbnb e Booking.com
          </h2>
          <p className="max-w-2xl text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            Conecte cada flat às suas contas do <strong>Airbnb</strong> e <strong>Booking.com</strong>. As reservas feitas no site bloqueiam as outras plataformas e as reservas feitas lá bloqueiam automaticamente o calendário da Casa da Pedra.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<RefreshIcon className={`size-4 ${isSyncing ? "animate-spin" : ""}`} />}
          isLoading={isSyncing}
          disabled={feeds.length === 0 || isSyncing}
          onClick={handleSyncAll}
          className="shrink-0"
        >
          Sincronizar Todos Agora
        </Button>
      </div>

      {/* Alerta caso a migration SQL ainda não tenha sido aplicada */}
      {schemaMissing && (
        <Alert variant="error">
          <strong>Atenção:</strong> As tabelas de sincronização iCal (<code>flat_ical_feeds</code> e{" "}
          <code>external_calendar_blocks</code>) ainda não foram encontradas no banco de dados. Execute o script{" "}
          <code>supabase/migrations/20261016000000_ical_sync.sql</code> no SQL Editor do Supabase para ativar o salvamento.
        </Alert>
      )}

      {/* Mensagem de Feedback */}
      {feedbackMsg && (
        <Alert variant={feedbackMsg.type === "error" ? "error" : "success"}>
          {feedbackMsg.text}
        </Alert>
      )}

      {/* Seletor de Flat */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3 dark:border-stone-800">
        {flats.map((flat) => {
          const isSelected = activeFlat?.id === flat.id;
          const flatFeedsCount = feeds.filter((f) => f.flat_id === flat.id).length;

          return (
            <button
              key={flat.id}
              type="button"
              onClick={() => {
                setSelectedFlatId(flat.id);
                setFeedbackMsg(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isSelected
                  ? "bg-stone-900 text-white shadow-xs dark:bg-amber-500 dark:text-stone-950"
                  : "bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              <span>{flat.titulo}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isSelected
                    ? "bg-white/20 text-white dark:bg-stone-950/20 dark:text-stone-950"
                    : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                }`}
              >
                {flatFeedsCount} {flatFeedsCount === 1 ? "conectado" : "conectados"}
              </span>
            </button>
          );
        })}
      </div>

      {activeFlat && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* PASSO 1: EXPORTAR CALENDÁRIO DO SITE PARA AIRBNB / BOOKING */}
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-amber-500 text-xs font-extrabold text-stone-950">
                  1
                </span>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50">
                  Exportar Calendário ({activeFlat.titulo})
                </h3>
              </div>

              <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                Copie o link abaixo e cole na opção <strong>&ldquo;Importar um calendário&rdquo;</strong> do{" "}
                <strong>Airbnb</strong> e do <strong>Booking.com</strong> referente ao flat{" "}
                <strong>{activeFlat.titulo}</strong>. Assim, toda reserva feita no nosso site bloqueará as datas lá automaticamente.
              </p>

              {/* Caixa com Link .ics */}
              <div className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-3.5 dark:border-stone-800 dark:bg-stone-950">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Link iCal oficial deste Flat (.ics)
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    readOnly
                    value={exportUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="h-10 flex-1 rounded-xl border border-stone-200 bg-white px-3 font-mono text-xs text-stone-800 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleCopyExportUrl}
                      leftIcon={
                        copiedFlatId === activeFlat.id ? (
                          <CheckIcon className="size-4" />
                        ) : (
                          <CopyIcon className="size-4" />
                        )
                      }
                      className="h-10 text-xs"
                    >
                      {copiedFlatId === activeFlat.id ? "Copiado!" : "Copiar Link"}
                    </Button>
                    <a
                      href={`/api/ical/${activeFlat.id}.ics`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Testar download do arquivo .ics"
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                    >
                      <ExternalLinkIcon className="size-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Guia Rápido de onde colar */}
              <div className="flex flex-col gap-2.5 rounded-2xl border border-stone-100 bg-stone-50/70 p-4 text-xs text-stone-600 dark:border-stone-800/80 dark:bg-stone-950/50 dark:text-stone-400">
                <p className="font-semibold text-stone-900 dark:text-stone-200">
                  Onde colar este link?
                </p>
                <p>
                  • <strong className="text-rose-600 dark:text-rose-400">No Airbnb:</strong> Painel do Anfitrião → Calendário → selecione o anúncio → <em>Disponibilidade</em> → <em>Conectar calendários</em> → <em>Conectar a outro site</em> → Cole o link acima.
                </p>
                <p>
                  • <strong className="text-blue-600 dark:text-blue-400">No Booking.com:</strong> Extranet → <em>Tarifas e Disponibilidade</em> → <em>Sincronizar calendários</em> → <em>Adicionar conexão de calendário</em> → Cole o link acima.
                </p>
              </div>
            </div>
          </div>

          {/* PASSO 2: IMPORTAR CALENDÁRIOS DO AIRBNB / BOOKING */}
          <div className="flex flex-col gap-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-amber-500 text-xs font-extrabold text-stone-950">
                2
              </span>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50">
                Importar do Airbnb e Booking ({activeFlat.titulo})
              </h3>
            </div>

            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              Cole abaixo o endereço de calendário (<code>.ics</code>) fornecido pelo <strong>Airbnb</strong> ou pelo{" "}
              <strong>Booking.com</strong> para este flat. O nosso site buscará automaticamente as reservas dessas plataformas.
            </p>

            <form onSubmit={handleAddFeed} className="flex flex-col gap-4">
              {/* Seletor de Plataforma */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Plataforma de origem
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["airbnb", "booking", "outro"] as IcalPlatform[]).map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setPlataforma(plat)}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        plataforma === plat
                          ? "border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200"
                          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400"
                      }`}
                    >
                      {PLATFORM_LABELS[plat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL .ics */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  URL do Calendário iCal (.ics) *
                </label>
                <input
                  type="url"
                  required
                  value={icalUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder={
                    plataforma === "airbnb"
                      ? "https://www.airbnb.com.br/calendar/ical/12345678.ics?s=..."
                      : plataforma === "booking"
                        ? "https://ical.booking.com/v1/export?t=..."
                        : "https://..."
                  }
                  className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 font-mono text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-hidden dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>

              {/* Nome de identificação opcional */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Identificação (opcional)
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder={`Ex.: ${PLATFORM_LABELS[plataforma]} - ${activeFlat.titulo}`}
                  className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-hidden dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isAdding}
                disabled={!icalUrl.trim() || isAdding}
                leftIcon={<PlusIcon className="size-4" />}
                className="w-full"
              >
                Conectar e Sincronizar Calendário
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* LISTA DE CALENDÁRIOS CONECTADOS E DATAS BLOQUEADAS */}
      {activeFlat && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Calendários Externos Conectados a este Flat */}
          <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon className="size-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-50">
                  Calendários Conectados ({activeFlatFeeds.length})
                </h3>
              </div>
            </div>

            {isLoading ? (
              <p className="py-6 text-center text-xs text-stone-500">
                Carregando conexões...
              </p>
            ) : activeFlatFeeds.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center text-xs text-stone-500 dark:border-stone-800">
                Nenhum calendário externo (Airbnb ou Booking.com) conectado ao{" "}
                <strong>{activeFlat.titulo}</strong> ainda.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeFlatFeeds.map((feed) => {
                  const isThisSyncing = syncingFeedId === feed.id;
                  return (
                    <div
                      key={feed.id}
                      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50/60 p-4 dark:border-stone-800 dark:bg-stone-950/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                                PLATFORM_BADGE_STYLES[feed.plataforma] ||
                                PLATFORM_BADGE_STYLES.outro
                              }`}
                            >
                              {PLATFORM_LABELS[feed.plataforma] || "Externo"}
                            </span>
                            <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                              {feed.nome}
                            </span>
                          </div>
                          <p
                            className="truncate font-mono text-[11px] text-stone-500"
                            title={feed.ical_url}
                          >
                            {feed.ical_url}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleSyncFeed(feed.id)}
                            disabled={isThisSyncing}
                            leftIcon={
                              <RefreshIcon
                                className={`size-3.5 ${isThisSyncing ? "animate-spin" : ""}`}
                              />
                            }
                            className="h-8 px-2.5 text-xs"
                          >
                            {isThisSyncing ? "Sincronizando..." : "Sincronizar"}
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFeed(feed)}
                            title="Remover calendário"
                            className="inline-flex size-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-red-600 transition hover:bg-red-50 dark:border-stone-800 dark:bg-stone-900 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            <TrashIcon className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Status da última sincronização */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/70 pt-2.5 text-[11px] dark:border-stone-800">
                        {feed.last_sync_status === "ok" ? (
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            ✓ Sincronizado ({feed.events_count}{" "}
                            {feed.events_count === 1 ? "bloqueio ativo" : "bloqueios ativos"})
                          </span>
                        ) : feed.last_sync_status === "error" ? (
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            ✕ Erro: {feed.last_sync_error || "Falha ao ler .ics"}
                          </span>
                        ) : (
                          <span className="text-stone-500">Aguardando primeira sincronização</span>
                        )}

                        {feed.last_synced_at && (
                          <span className="text-stone-400">
                            Última atualização:{" "}
                            {format(parseISO(feed.last_synced_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Datas Bloqueadas Importadas para este Flat */}
          <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-50">
                  Datas Bloqueadas via Airbnb / Booking ({activeFlatBlocks.length})
                </h3>
              </div>
            </div>

            {isLoading ? (
              <p className="py-6 text-center text-xs text-stone-500">
                Carregando bloqueios...
              </p>
            ) : activeFlatBlocks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center text-xs text-stone-500 dark:border-stone-800">
                Nenhum bloqueio externo futuro para o <strong>{activeFlat.titulo}</strong> no momento.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto pr-1">
                <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                  {activeFlatBlocks.map((block) => {
                    const start = parseISO(block.data_inicio);
                    const end = parseISO(block.data_fim);
                    const nights = Math.max(1, differenceInCalendarDays(end, start));

                    return (
                      <li
                        key={block.id}
                        className="flex items-center justify-between gap-3 py-3 text-xs"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-bold ${
                                PLATFORM_BADGE_STYLES[block.plataforma] ||
                                PLATFORM_BADGE_STYLES.outro
                              }`}
                            >
                              {PLATFORM_LABELS[block.plataforma] || "Externo"}
                            </span>
                            <span className="truncate font-semibold text-stone-800 dark:text-stone-200">
                              {block.summary}
                            </span>
                          </div>
                          <span className="text-stone-500 dark:text-stone-400">
                            Check-in:{" "}
                            <strong className="text-stone-800 dark:text-stone-200">
                              {format(start, "dd/MM/yyyy", { locale: ptBR })}
                            </strong>{" "}
                            → Check-out:{" "}
                            <strong className="text-stone-800 dark:text-stone-200">
                              {format(end, "dd/MM/yyyy", { locale: ptBR })}
                            </strong>
                          </span>
                        </div>

                        <span className="shrink-0 rounded-xl bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                          {nights} {nights === 1 ? "noite" : "noites"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
