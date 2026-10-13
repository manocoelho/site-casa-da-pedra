-- =============================================================================
-- Casa da Pedra — Dados iniciais: os 2 flats e suas fotos
-- -----------------------------------------------------------------------------
-- Idempotente (on conflict do nothing). As URLs apontam para /public/images/flats;
-- substitua-as por URLs do bucket `flat-photos` quando tiver as fotos reais.
-- =============================================================================

insert into public.flats (id, titulo, descricao, preco_diaria, max_hospedes, created_at)
values
  (
    '6f1c2a3e-1b7d-4c55-9a10-000000000001',
    'Flat Mirante da Pedra',
    'Flat no andar superior com vista panorâmica para as serras de Bananeiras. '
      || 'Sala aconchegante com parede de pedra natural, quarto de casal com roupa de cama '
      || 'premium e varanda privativa com rede — perfeita para ver o nascer do sol entre a neblina. '
      || 'Cozinha equipada, Wi-Fi e estacionamento. A poucos minutos do centro histórico.',
    320.00,
    4,
    '2026-10-12 00:00:00+00'
  ),
  (
    '6f1c2a3e-1b7d-4c55-9a10-000000000002',
    'Flat Jardim da Serra',
    'Studio térreo integrado a um jardim tropical, ideal para casais. '
      || 'Suíte com porta de vidro para o jardim, cozinha compacta com bancada de madeira '
      || 'e deck privativo com fogueira e luzes — o cenário ideal para as noites frias da serra. '
      || 'Wi-Fi, café da manhã regional sob consulta e acesso fácil às trilhas e cachoeiras da região.',
    260.00,
    2,
    '2026-10-12 00:00:01+00'
  )
on conflict (id) do nothing;

insert into public.flat_photos (id, flat_id, url_imagem, created_at)
values
  ('a3d0b9c4-5e6f-4a1b-8c2d-000000000101', '6f1c2a3e-1b7d-4c55-9a10-000000000001', '/images/flats/mirante-sala.jpg',    '2026-10-12 00:00:00+00'),
  ('a3d0b9c4-5e6f-4a1b-8c2d-000000000102', '6f1c2a3e-1b7d-4c55-9a10-000000000001', '/images/flats/mirante-quarto.jpg',  '2026-10-12 00:00:01+00'),
  ('a3d0b9c4-5e6f-4a1b-8c2d-000000000103', '6f1c2a3e-1b7d-4c55-9a10-000000000001', '/images/flats/mirante-varanda.jpg', '2026-10-12 00:00:02+00'),
  ('a3d0b9c4-5e6f-4a1b-8c2d-000000000201', '6f1c2a3e-1b7d-4c55-9a10-000000000002', '/images/flats/jardim-suite.jpg',    '2026-10-12 00:00:00+00'),
  ('a3d0b9c4-5e6f-4a1b-8c2d-000000000202', '6f1c2a3e-1b7d-4c55-9a10-000000000002', '/images/flats/jardim-cozinha.jpg',  '2026-10-12 00:00:01+00'),
  ('a3d0b9c4-5e6f-4a1b-8c2d-000000000203', '6f1c2a3e-1b7d-4c55-9a10-000000000002', '/images/flats/jardim-deck.jpg',     '2026-10-12 00:00:02+00')
on conflict (id) do nothing;
