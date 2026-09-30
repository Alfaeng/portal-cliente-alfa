-- =====================================================================
-- Fase 1b — HEIC nos uploads e uma resposta por cliente em cada pesquisa
-- =====================================================================

-- Fotos de iPhone (HEIC/HEIF) passam a ser aceitas no upload.
-- A maioria dos navegadores não exibe HEIC, por isso o envio de fotos converte
-- tudo para JPEG antes de salvar (ver src/lib/media/processar-foto.ts).
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id in ('logos', 'obras');

-- Cada cliente responde uma única vez a cada campanha. Linhas sem cliente
-- (cliente_id nulo, ex.: cliente excluído) não entram na regra.
alter table public.respostas_pesquisa
  add constraint respostas_uma_por_cliente unique (campanha_id, cliente_id);

-- O índice único acima já cobre buscas por campanha_id.
drop index if exists public.respostas_campanha_idx;
