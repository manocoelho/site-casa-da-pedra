import type { IcalPlatform, ParsedIcalEvent } from "@/types/ical";

/**
 * Converte uma string de data iCal (ex: "20261020" ou "20261020T140000Z")
 * para o formato ISO "YYYY-MM-DD".
 */
function parseIcalDateString(raw: string): string | null {
  const cleaned = raw.trim();
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;

  const [, year, month, day] = match;
  const iso = `${year}-${month}-${day}`;

  // Validação simples de data válida
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;

  return iso;
}

/**
 * Adiciona 1 dia a uma data "YYYY-MM-DD" (usado caso um VEVENT venha sem DTEND).
 */
function addOneDayIso(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

/**
 * Remove caracteres de escape padrão do RFC 5545 em textos (SUMMARY, DESCRIPTION).
 */
function unescapeIcalText(text: string): string {
  return text
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

/**
 * Escapa textos para geração de arquivo .ics compatível com RFC 5545.
 */
function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Faz o parse de um conteúdo de arquivo iCal (.ics) do Airbnb, Booking.com ou similar,
 * retornando os intervalos bloqueados/reservados.
 */
export function parseIcalContent(icsContent: string): ParsedIcalEvent[] {
  if (!icsContent || !icsContent.includes("BEGIN:VCALENDAR")) {
    throw new Error("O conteúdo recebido não é um calendário iCal (.ics) válido.");
  }

  // RFC 5545 Section 3.1: Desdobra linhas quebradas com CRLF + espaço/tab
  const unfolded = icsContent.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events: ParsedIcalEvent[] = [];
  const seenUids = new Set<string>();

  let inEvent = false;
  let uid = "";
  let summary = "";
  let status = "";
  let dtStart: string | null = null;
  let dtEnd: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.toUpperCase() === "BEGIN:VEVENT") {
      inEvent = true;
      uid = "";
      summary = "";
      status = "";
      dtStart = null;
      dtEnd = null;
      continue;
    }

    if (line.toUpperCase() === "END:VEVENT") {
      if (inEvent && dtStart && status.toUpperCase() !== "CANCELLED") {
        const finalEnd = dtEnd && dtEnd > dtStart ? dtEnd : addOneDayIso(dtStart);
        const finalUid = uid || `evt-${dtStart}-${finalEnd}-${events.length}`;

        if (!seenUids.has(finalUid)) {
          seenUids.add(finalUid);
          events.push({
            external_uid: finalUid,
            summary: summary || "Reservado",
            data_inicio: dtStart,
            data_fim: finalEnd,
          });
        }
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const propPart = line.slice(0, colonIndex).toUpperCase();
    const valuePart = line.slice(colonIndex + 1);
    const propName = propPart.split(";")[0];

    switch (propName) {
      case "UID":
        uid = unescapeIcalText(valuePart);
        break;
      case "SUMMARY":
        summary = unescapeIcalText(valuePart);
        break;
      case "STATUS":
        status = valuePart.trim().toUpperCase();
        break;
      case "DTSTART":
        dtStart = parseIcalDateString(valuePart);
        break;
      case "DTEND":
        dtEnd = parseIcalDateString(valuePart);
        break;
    }
  }

  return events;
}

/**
 * Formata uma data "YYYY-MM-DD" para "YYYYMMDD" (formato VALUE=DATE do iCal).
 */
function toIcalDateValue(isoDate: string): string {
  return isoDate.replace(/-/g, "").slice(0, 8);
}

/**
 * Formata um Date ou ISO timestamp para o formato UTC do DTSTAMP ("YYYYMMDDTHHMMSSZ").
 */
function toIcalTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export interface GenerateIcalOptions {
  flatId: string;
  flatTitle: string;
  reservations: Array<{
    id?: string;
    data_inicio: string;
    data_fim: string;
    status?: string;
    created_at?: string;
  }>;
}

/**
 * Gera um arquivo .ics padrão RFC 5545 com todas as reservas ativas do flat
 * para ser importado pelo Airbnb, Booking.com e outros canais.
 */
export function generateIcalContent({
  flatId,
  flatTitle,
  reservations,
}: GenerateIcalOptions): string {
  const nowStamp = toIcalTimestamp(new Date());
  const cleanTitle = escapeIcalText(`Casa da Pedra - ${flatTitle}`);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Casa da Pedra//Calendario de Reservas//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${cleanTitle}`,
    "X-WR-TIMEZONE:America/Fortaleza",
  ];

  for (let i = 0; i < reservations.length; i++) {
    const res = reservations[i];
    const startVal = toIcalDateValue(res.data_inicio);
    const endVal = toIcalDateValue(res.data_fim);
    if (startVal.length !== 8 || endVal.length !== 8 || endVal <= startVal) {
      continue;
    }

    const uid = res.id
      ? `reserva-${res.id}@site-casa-da-pedra.vercel.app`
      : `reserva-${flatId}-${startVal}-${endVal}-${i}@site-casa-da-pedra.vercel.app`;

    const createdStamp = res.created_at
      ? toIcalTimestamp(new Date(res.created_at))
      : nowStamp;

    const statusLabel = res.status === "pendente" ? "Pré-Reserva" : "Reservado";

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${createdStamp}`,
      `DTSTART;VALUE=DATE:${startVal}`,
      `DTEND;VALUE=DATE:${endVal}`,
      `SUMMARY:${escapeIcalText(`CLOSED - ${statusLabel} (Casa da Pedra)`)}`,
      `DESCRIPTION:${escapeIcalText(`Período reservado no site oficial Casa da Pedra (${flatTitle}).`)}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  // RFC 5545 exige quebras de linha CRLF (\r\n)
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * Identifica automaticamente a plataforma com base na URL do calendário .ics.
 */
export function detectPlatformFromUrl(url: string): IcalPlatform {
  const lower = url.toLowerCase();
  if (lower.includes("airbnb.")) return "airbnb";
  if (lower.includes("booking.com")) return "booking";
  return "outro";
}
