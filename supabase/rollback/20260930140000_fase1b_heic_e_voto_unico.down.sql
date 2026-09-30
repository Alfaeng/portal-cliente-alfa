-- Desfaz supabase/migrations/20260930140000_fase1b_heic_e_voto_unico.sql

create index if not exists respostas_campanha_idx on public.respostas_pesquisa (campanha_id);

alter table public.respostas_pesquisa drop constraint if exists respostas_uma_por_cliente;

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('logos', 'obras');
