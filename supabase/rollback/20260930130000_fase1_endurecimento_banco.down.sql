-- Desfaz supabase/migrations/20260930130000_fase1_endurecimento_banco.sql
-- Restaura o estado do baseline (políticas `to public` e funções executáveis).

create index if not exists clientes_cpf_idx on public.clientes (cpf);
drop index if exists public.usuarios_admin_convidado_por_idx;
drop index if exists public.respostas_cliente_idx;
drop index if exists public.campanhas_created_by_idx;

update storage.buckets
set file_size_limit = null, allowed_mime_types = null
where id in ('logos', 'obras');

do $$
declare
  p text;
begin
  foreach p in array array[
    'Escrita logos admin', 'Atualiza logos admin', 'Remove logos admin',
    'Escrita obras admin', 'Atualiza obras admin', 'Remove obras admin'
  ] loop
    execute format('alter policy %I on storage.objects to public', p);
  end loop;
end $$;

drop policy if exists "Leitura admin storage" on storage.objects;
create policy "Leitura publica logos" on storage.objects
  for select using (bucket_id = 'logos');
create policy "Leitura publica obras" on storage.objects
  for select using (bucket_id = 'obras');

-- respostas / campanhas
drop policy if exists respostas_rw on public.respostas_pesquisa;
create policy respostas_rw on public.respostas_pesquisa
  for all using (public.nivel_acesso_atual() in ('editor_completo', 'administrador'))
  with check (public.nivel_acesso_atual() in ('editor_completo', 'administrador'));

drop policy if exists campanhas_rw on public.campanhas_pesquisa;
create policy campanhas_rw on public.campanhas_pesquisa
  for all using (public.nivel_acesso_atual() in ('editor_completo', 'administrador'))
  with check (public.nivel_acesso_atual() in ('editor_completo', 'administrador'));

-- fotos / etapas / empreendimentos
drop policy if exists fotos_insert on public.fotos;
drop policy if exists fotos_update on public.fotos;
drop policy if exists fotos_delete on public.fotos;
drop policy if exists fotos_select on public.fotos;
create policy fotos_select on public.fotos for select using (public.eh_admin());
create policy fotos_write on public.fotos for all
  using (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'))
  with check (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'));

drop policy if exists etapas_insert on public.empreendimento_etapas;
drop policy if exists etapas_update on public.empreendimento_etapas;
drop policy if exists etapas_delete on public.empreendimento_etapas;
drop policy if exists etapas_select on public.empreendimento_etapas;
create policy etapas_select on public.empreendimento_etapas for select using (public.eh_admin());
create policy etapas_write on public.empreendimento_etapas for all
  using (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'))
  with check (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'));

drop policy if exists empreendimentos_insert on public.empreendimentos;
drop policy if exists empreendimentos_update on public.empreendimentos;
drop policy if exists empreendimentos_delete on public.empreendimentos;
drop policy if exists empreendimentos_select on public.empreendimentos;
create policy empreendimentos_select on public.empreendimentos for select using (public.eh_admin());
create policy empreendimentos_write on public.empreendimentos for all
  using (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'))
  with check (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'));

-- clientes
drop policy if exists clientes_admin on public.clientes;
create policy clientes_admin on public.clientes for all
  using (public.nivel_acesso_atual() = 'administrador')
  with check (public.nivel_acesso_atual() = 'administrador');

-- usuarios_admin
drop policy if exists usuarios_admin_insert on public.usuarios_admin;
drop policy if exists usuarios_admin_update on public.usuarios_admin;
drop policy if exists usuarios_admin_delete on public.usuarios_admin;
drop policy if exists usuarios_admin_select on public.usuarios_admin;
create policy usuarios_admin_select on public.usuarios_admin for select using (public.eh_admin());
create policy usuarios_admin_write on public.usuarios_admin for all
  using (public.nivel_acesso_atual() = 'administrador')
  with check (public.nivel_acesso_atual() = 'administrador');

-- funções
alter function public.set_updated_at() reset search_path;
grant execute on function public.set_updated_at() to public, anon, authenticated;
grant execute on function public.marcar_convite_ativo() to public, anon, authenticated;
grant execute on function public.purgar_fotos_excluidas() to public, anon, authenticated;
grant execute on function public.nivel_acesso_atual() to public, anon, authenticated;
grant execute on function public.eh_admin() to public, anon, authenticated;
