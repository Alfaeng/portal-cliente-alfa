-- =====================================================================
-- Fase 1b — HEIC nos uploads e uma resposta por cliente em cada pesquisa
-- Rollback: supabase/rollback/20260930140000_fase1b_heic_e_voto_unico.down.sql
-- =====================================================================

-- Fotos de iPhone (HEIC/HEIF) passam a ser aceitas no upload.
-- Atenção: a maioria dos navegadores (Chrome, Edge, Firefox) não exibe HEIC;
-- a conversão para JPEG no envio está prevista na fase 4 do plano.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id in ('logos', 'obras');

-- Cada cliente responde uma única vez a cada campanha. Linhas sem cliente
-- (cliente_id nulo, ex.: cliente excluído) não entram na regra.
alter table public.respostas_pesquisa
  add constraint respostas_uma_por_cliente unique (campanha_id, cliente_id);

-- O índice único acima já cobre buscas por campanha_id.
drop index if exists public.respostas_campanha_idx;
