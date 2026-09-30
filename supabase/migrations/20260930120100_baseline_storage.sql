-- =====================================================================
-- Storage buckets — Portal do Cliente Alfa
-- Rode depois do schema.sql
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('obras', 'obras', true)
on conflict (id) do nothing;

-- Leitura pública (logos e fotos de obra aparecem no portal do cliente
-- e no site, sem exigir sessão).
drop policy if exists "Leitura publica logos" on storage.objects;
create policy "Leitura publica logos" on storage.objects
  for select using (bucket_id = 'logos');

drop policy if exists "Leitura publica obras" on storage.objects;
create policy "Leitura publica obras" on storage.objects
  for select using (bucket_id = 'obras');

-- Escrita só para admins com nível editor_obras, editor_completo ou administrador.
drop policy if exists "Escrita logos admin" on storage.objects;
create policy "Escrita logos admin" on storage.objects
  for insert with check (
    bucket_id = 'logos'
    and public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador')
  );

drop policy if exists "Atualiza logos admin" on storage.objects;
create policy "Atualiza logos admin" on storage.objects
  for update using (
    bucket_id = 'logos'
    and public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador')
  );

drop policy if exists "Remove logos admin" on storage.objects;
create policy "Remove logos admin" on storage.objects
  for delete using (
    bucket_id = 'logos'
    and public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador')
  );

drop policy if exists "Escrita obras admin" on storage.objects;
create policy "Escrita obras admin" on storage.objects
  for insert with check (
    bucket_id = 'obras'
    and public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador')
  );

drop policy if exists "Atualiza obras admin" on storage.objects;
create policy "Atualiza obras admin" on storage.objects
  for update using (
    bucket_id = 'obras'
    and public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador')
  );

drop policy if exists "Remove obras admin" on storage.objects;
create policy "Remove obras admin" on storage.objects
  for delete using (
    bucket_id = 'obras'
    and public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador')
  );
