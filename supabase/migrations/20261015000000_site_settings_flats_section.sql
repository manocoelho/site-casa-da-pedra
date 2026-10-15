-- =============================================================================
-- Migration: 20261015000000_site_settings_flats_section.sql
-- Adiciona campos para edição dos textos da seção de flats (catálogo de hospedagem)
-- =============================================================================

alter table public.site_settings
  add column if not exists flats_section_tag text not null default 'Hospedagem',
  add column if not exists flats_section_title text not null default 'Escolha o seu flat',
  add column if not exists flats_section_subtitle text not null default 'Espaços completos e aconchegantes para viver Bananeiras no seu ritmo — do café com vista para a serra às noites frias ao pé da fogueira.';
