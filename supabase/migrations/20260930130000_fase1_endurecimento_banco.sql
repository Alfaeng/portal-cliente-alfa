-- =====================================================================
-- Fase 1 — Endurecimento do banco (sem mudança de comportamento do app)
--
-- 1. Funções: ninguém anônimo executa funções SECURITY DEFINER via /rpc.
-- 2. Políticas: separadas por comando, `to authenticated`, sem duplicatas.
-- 3. Storage: sem listagem anônima; limite de tamanho e tipo de arquivo.
-- 4. Índices em chaves estrangeiras.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Funções
-- ---------------------------------------------------------------------
-- As funções usadas pela RLS precisam ser executáveis por quem está logado.
revoke execute on function public.eh_admin() from public, anon;
revoke execute on function public.nivel_acesso_atual() from public, anon;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.nivel_acesso_atual() to authenticated;

-- Não devem ser chamáveis pela API. A purga roda via pg_cron (postgres) e o
-- trigger dispara sem checar EXECUTE do usuário que fez a alteração.
revoke execute on function public.purgar_fotos_excluidas() from public, anon, authenticated;
revoke execute on function public.marcar_convite_ativo() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = '';

-- ---------------------------------------------------------------------
-- 2. Políticas das tabelas
-- ---------------------------------------------------------------------
-- usuarios_admin
drop policy if exists usuarios_admin_select on public.usuarios_admin;
drop policy if exists usuarios_admin_write on public.usuarios_admin;

create policy usuarios_admin_select on public.usuarios_admin
  for select to authenticated
  using ((select public.eh_admin()));

create policy usuarios_admin_insert on public.usuarios_admin
  for insert to authenticated
  with check ((select public.nivel_acesso_atual()) = 'administrador');

create policy usuarios_admin_update on public.usuarios_admin
  for update to authenticated
  using ((select public.nivel_acesso_atual()) = 'administrador')
  with check ((select public.nivel_acesso_atual()) = 'administrador');

create policy usuarios_admin_delete on public.usuarios_admin
  for delete to authenticated
  using ((select public.nivel_acesso_atual()) = 'administrador');

-- clientes (só administrador)
drop policy if exists clientes_admin on public.clientes;
create policy clientes_admin on public.clientes
  for all to authenticated
  using ((select public.nivel_acesso_atual()) = 'administrador')
  with check ((select public.nivel_acesso_atual()) = 'administrador');

-- empreendimentos / etapas / fotos:
-- leitura para qualquer admin; escrita para editor_obras ou acima.
drop policy if exists empreendimentos_select on public.empreendimentos;
drop policy if exists empreendimentos_write on public.empreendimentos;
create policy empreendimentos_select on public.empreendimentos
  for select to authenticated using ((select public.eh_admin()));
create policy empreendimentos_insert on public.empreendimentos
  for insert to authenticated
  with check ((select public.nivel_acesso_atual()) in ('editor_obras', 'editor_completo', 'administrador'));
create policy empreendimentos_update on public.empreendimentos
  for update to authenticated
  using ((select public.nivel_acesso_atual()) in ('editor_obras', 'editor_completo', 'administrador'))
  with check ((select public.nivel_acesso_atual()) in ('editor_obras', 'editor_completo', 'administrador'));
create policy empreendimentos_delete on public.empreendimentos
  for delete to authenticated
  using ((select public.nivel_acesso_atual()) in ('editor_completo', 'administrador'));

drop policy if exists etapas_select on public.empreendimento_etapas;
drop policy if exists etapas_write on public.empreendimento_etapas;
create policy etapas_select on public.empreendimento_etapas
  for select to authenticated using ((select public.eh_admin()));
create policy etapas_insert on public.empreendimento_etapas
  for insert to authenticated
  with check ((select public.nivel_acesso_atual()) in ('editor_obras', 'editor_completo', 'administrador'));
create policy etapas_update on public.empreendimento_etapas
  for update to authenticated
  using ((select public.nivel_acesso_atual()) in ('editor_obras', 'editor_completo', 'administrador'))
  with check ((select public.nivel_acesso_atual()) in ('editor_obras', 'editor_completo', 'administrador'));
create policy etapas_delete on public.empreendimento_etapas
  for delete to authenticated
  using ((select public.nivel_acesso_atual()) in ('editor_obras', 'editor_completo', 'administrador'));

drop policy if exists fotos_select on public.fotos;
drop policy if exists fotos_write on public.fotos;
create policy fotos_select on public.fotos
  for select to authenticated using ((select public.eh_admin()));
create policy fotos_insert on public.fotos
  for insert to authenticated
  with check ((select public.nivel_acesso_atual()) in ('editor_obras', 'editor_completo', 'administrador'));
create policy fotos_update on public.fotos
  for update to authenticated
  using ((select public.nivel_acesso_atual()) in ('editor_obras', 'editor_completo', 'administrador'))
  with check ((select public.nivel_acesso_atual()) in ('editor_obras', 'editor_completo', 'administrador'));
create policy fotos_delete on public.fotos
  for delete to authenticated
  using ((select public.nivel_acesso_atual()) in ('editor_obras', 'editor_completo', 'administrador'));

-- campanhas / respostas (editor_completo ou administrador)
drop policy if exists campanhas_rw on public.campanhas_pesquisa;
create policy campanhas_rw on public.campanhas_pesquisa
  for all to authenticated
  using ((select public.nivel_acesso_atual()) in ('editor_completo', 'administrador'))
  with check ((select public.nivel_acesso_atual()) in ('editor_completo', 'administrador'));

drop policy if exists respostas_rw on public.respostas_pesquisa;
create policy respostas_rw on public.respostas_pesquisa
  for all to authenticated
  using ((select public.nivel_acesso_atual()) in ('editor_completo', 'administrador'))
  with check ((select public.nivel_acesso_atual()) in ('editor_completo', 'administrador'));

-- ---------------------------------------------------------------------
-- 3. Storage
-- ---------------------------------------------------------------------
-- Buckets públicos continuam servindo os arquivos por URL sem política de
-- SELECT. Removê-la impede a listagem anônima dos nomes de arquivo.
drop policy if exists "Leitura publica logos" on storage.objects;
drop policy if exists "Leitura publica obras" on storage.objects;

-- O admin precisa listar (ex.: excluir empreendimento remove a pasta).
create policy "Leitura admin storage" on storage.objects
  for select to authenticated
  using (bucket_id in ('logos', 'obras') and (select public.eh_admin()));

do $$
declare
  p text;
begin
  foreach p in array array[
    'Escrita logos admin', 'Atualiza logos admin', 'Remove logos admin',
    'Escrita obras admin', 'Atualiza obras admin', 'Remove obras admin'
  ] loop
    execute format('alter policy %I on storage.objects to authenticated', p);
  end loop;
end $$;

update storage.buckets
set file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('logos', 'obras');

-- ---------------------------------------------------------------------
-- 4. Índices
-- ---------------------------------------------------------------------
create index if not exists campanhas_created_by_idx on public.campanhas_pesquisa (created_by);
create index if not exists respostas_cliente_idx on public.respostas_pesquisa (cliente_id);
create index if not exists usuarios_admin_convidado_por_idx on public.usuarios_admin (convidado_por);

-- clientes.cpf já tem índice pela constraint unique; este era redundante.
drop index if exists public.clientes_cpf_idx;
