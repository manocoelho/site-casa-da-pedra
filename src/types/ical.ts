export type IcalPlatform = "airbnb" | "booking" | "outro";

export interface FlatIcalFeed {
  id: string;
  flat_id: string;
  plataforma: IcalPlatform;
  nome: string;
  ical_url: string;
  last_synced_at: string | null;
  last_sync_status: "ok" | "error" | null;
  last_sync_error: string | null;
  events_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExternalCalendarBlock {
  id: string;
  feed_id: string;
  flat_id: string;
  plataforma: IcalPlatform;
  external_uid: string;
  summary: string;
  data_inicio: string;
  data_fim: string;
  updated_at: string;
}

export interface ParsedIcalEvent {
  external_uid: string;
  summary: string;
  data_inicio: string;
  data_fim: string;
}

export interface CreateIcalFeedInput {
  flatId: string;
  plataforma: IcalPlatform;
  nome: string;
  icalUrl: string;
}

export interface IcalSyncFeedResult {
  feedId: string;
  flatId: string;
  plataforma: IcalPlatform;
  nome: string;
  ok: boolean;
  eventsCount: number;
  error?: string;
}
