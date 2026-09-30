-- =====================================================================
-- Fase 6 (parte A) — LGPD: CPF protegido, auditoria e aceite da política
--
-- Esta parte é ADITIVA: não remove nada e o código antigo continua
-- funcionando. A remoção da coluna `cpf` (texto puro) acontece na parte B,
-- depois que o código novo estiver no ar.
--
-- O que muda:
--  1. O CPF passa a ser guardado como hash com chave secreta (HMAC-SHA256)
--     mais uma versão mascarada para exibição. A chave (pepper) é gerada
--     aqui dentro, no Vault do Supabase — nunca aparece em código ou logs.
--  2. Log de auditoria "só de inserção" de quem mexeu em clientes, usuários
--     e vínculos (sem gravar dados pessoais, só quais colunas mudaram).
--  3. Registro de aceite da política de privacidade.
--  4. Funções (só o servidor chama) para localizar, criar e importar
--     clientes sem nunca gravar o CPF em claro, e para exportar os dados de
--     um cliente (direito de acesso do titular).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Schema interno (não exposto pela API) e chave secreta no Vault
-- ---------------------------------------------------------------------
create schema if not exists interno;
revoke all on schema interno from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cpf_pepper') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'cpf_pepper',
      'Chave usada no hash do CPF dos clientes. NÃO APAGAR: sem ela, nenhum CPF cadastrado pode ser localizado de novo.'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Funções auxiliares do CPF
-- ---------------------------------------------------------------------
create or replace function interno.hash_cpf(p_cpf text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_digitos text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_pepper text;
begin
  if length(v_digitos) <> 11 then
    raise exception 'cpf_invalido';
  end if;

  select decrypted_secret into v_pepper
  from vault.decrypted_secrets
  where name = 'cpf_pepper';

  if v_pepper is null then
    raise exception 'pepper_ausente';
  end if;

  return encode(extensions.hmac(v_digitos, v_pepper, 'sha256'), 'hex');
end;
$$;

create or replace function interno.mascarar_cpf(p_cpf text)
returns text
language sql
immutable
set search_path = ''
as $$
  select '***.' || substr(d, 4, 3) || '.' || substr(d, 7, 3) || '-**'
  from (select regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g') as d) t;
$$;

-- ---------------------------------------------------------------------
-- 2. Novas colunas em clientes (o CPF em texto puro sai na parte B)
-- ---------------------------------------------------------------------
alter table public.clientes
  add column if not exists cpf_hash text,
  add column if not exists cpf_mascarado text;

alter table public.clientes alter column cpf drop not null;

-- Enquanto o código antigo ainda grava `cpf`, o gatilho mantém hash e
-- máscara sempre em dia.
create or replace function interno.clientes_preencher_cpf()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cpf is not null then
    new.cpf_hash := interno.hash_cpf(new.cpf);
    new.cpf_mascarado := interno.mascarar_cpf(new.cpf);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clientes_cpf on public.clientes;
create trigger trg_clientes_cpf
  before insert or update of cpf on public.clientes
  for each row execute function interno.clientes_preencher_cpf();

-- Preenche hash e máscara dos clientes que já existem.
update public.clientes set cpf = cpf where cpf is not null and cpf_hash is null;

create unique index if not exists clientes_cpf_hash_key on public.clientes (cpf_hash);

-- ---------------------------------------------------------------------
-- 3. Auditoria (só inserção)
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  ocorrido_em timestamptz not null default now(),
  usuario_id uuid,
  acao text not null,
  tabela text,
  registro_id text,
  detalhes jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_ocorrido_idx on public.audit_log (ocorrido_em desc);

comment on table public.audit_log is 'Registro de quem fez o quê com dados pessoais. Só inserção; nunca guarda valores, apenas quais colunas mudaram.';

alter table public.audit_log enable row level security;

create policy audit_log_leitura_admin on public.audit_log
  for select to authenticated
  using ((select public.nivel_acesso_atual()) = 'administrador');

-- Nem o servidor consegue editar ou apagar o histórico pela API.
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated, service_role;

create or replace function interno.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid;
  v_linha jsonb;
  v_colunas text[];
begin
  -- Quem agiu: o administrador informado pelo servidor (app.usuario_id) ou,
  -- se a chamada veio do painel, o usuário logado.
  v_usuario := coalesce(nullif(current_setting('app.usuario_id', true), '')::uuid, auth.uid());
  v_linha := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into v_colunas
    from jsonb_each(to_jsonb(new)) as n(key, value)
    join jsonb_each(to_jsonb(old)) as o(key, value) on o.key = n.key
    where n.value is distinct from o.value and n.key <> 'updated_at';
  end if;

  insert into public.audit_log (usuario_id, acao, tabela, registro_id, detalhes)
  values (
    v_usuario,
    lower(tg_op),
    tg_table_name,
    coalesce(v_linha->>'id', v_linha->>'cliente_id'),
    case when v_colunas is not null then jsonb_build_object('colunas', to_jsonb(v_colunas)) else '{}'::jsonb end
  );
  return null;
end;
$$;

drop trigger if exists trg_audit_clientes on public.clientes;
create trigger trg_audit_clientes
  after insert or update or delete on public.clientes
  for each row execute function interno.registrar_auditoria();

drop trigger if exists trg_audit_usuarios_admin on public.usuarios_admin;
create trigger trg_audit_usuarios_admin
  after insert or update or delete on public.usuarios_admin
  for each row execute function interno.registrar_auditoria();

drop trigger if exists trg_audit_cliente_empreendimentos on public.cliente_empreendimentos;
create trigger trg_audit_cliente_empreendimentos
  after insert or update or delete on public.cliente_empreendimentos
  for each row execute function interno.registrar_auditoria();

-- ---------------------------------------------------------------------
-- 4. Aceite da política de privacidade
-- ---------------------------------------------------------------------
create table if not exists public.aceites_termos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  versao text not null,
  aceito_em timestamptz not null default now(),
  unique (cliente_id, versao)
);

comment on table public.aceites_termos is 'Registro de quando cada cliente tomou ciência de cada versão da política de privacidade.';

alter table public.aceites_termos enable row level security;

create policy aceites_termos_leitura_admin on public.aceites_termos
  for select to authenticated
  using ((select public.nivel_acesso_atual()) = 'administrador');

-- ---------------------------------------------------------------------
-- 5. Funções chamadas só pelo servidor (service_role)
-- ---------------------------------------------------------------------
create or replace function public.buscar_cliente_por_cpf(p_cpf text)
returns table (id uuid, nome text, ativo boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select c.id, c.nome, c.ativo
    from public.clientes c
    where c.cpf_hash = interno.hash_cpf(p_cpf);
exception when others then
  return; -- CPF fora do formato: sem resultado, sem detalhes
end;
$$;

create or replace function public.criar_cliente(
  p_admin uuid, p_cpf text, p_nome text, p_email text, p_telefone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform set_config('app.usuario_id', coalesce(p_admin::text, ''), true);
  insert into public.clientes (cpf_hash, cpf_mascarado, nome, email, telefone, ativo)
  values (interno.hash_cpf(p_cpf), interno.mascarar_cpf(p_cpf), p_nome, nullif(p_email, ''), nullif(p_telefone, ''), true)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.importar_clientes(p_admin uuid, p_linhas jsonb)
returns table (ordem int, id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.usuario_id', coalesce(p_admin::text, ''), true);

  return query
  with entrada as (
    select
      e.ord::int as n_linha,
      interno.hash_cpf(e.v->>'cpf') as h,
      interno.mascarar_cpf(e.v->>'cpf') as mascara,
      e.v->>'nome' as nome,
      nullif(e.v->>'email', '') as email,
      nullif(e.v->>'telefone', '') as telefone
    from jsonb_array_elements(p_linhas) with ordinality as e(v, ord)
  ),
  unicos as (
    -- CPF repetido na mesma planilha: vale a última linha.
    select distinct on (h) h, mascara, nome, email, telefone
    from entrada
    order by h, n_linha desc
  ),
  gravados as (
    insert into public.clientes (cpf_hash, cpf_mascarado, nome, email, telefone, ativo)
    select h, mascara, nome, email, telefone, true from unicos
    on conflict (cpf_hash) do update
      set nome = excluded.nome,
          email = excluded.email,
          telefone = excluded.telefone,
          ativo = true,
          updated_at = now()
    returning clientes.id, clientes.cpf_hash
  )
  select entrada.n_linha, gravados.id
  from entrada
  join gravados on gravados.cpf_hash = entrada.h;
end;
$$;

create or replace function public.registrar_evento(
  p_usuario uuid, p_acao text, p_tabela text, p_registro text, p_detalhes jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (usuario_id, acao, tabela, registro_id, detalhes)
  values (p_usuario, p_acao, p_tabela, p_registro, coalesce(p_detalhes, '{}'::jsonb));
$$;

-- Direito de acesso do titular (LGPD, art. 18): todos os dados que a Alfa
-- guarda sobre um cliente, em um único documento.
create or replace function public.dados_do_cliente(p_admin uuid, p_cliente_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  select jsonb_build_object(
    'cliente', jsonb_build_object(
      'nome', c.nome,
      'cpf_mascarado', c.cpf_mascarado,
      'email', c.email,
      'telefone', c.telefone,
      'ativo', c.ativo,
      'cadastrado_em', c.importado_em
    ),
    'empreendimentos', coalesce((
      select jsonb_agg(e.nome order by e.nome)
      from public.cliente_empreendimentos v
      join public.empreendimentos e on e.id = v.empreendimento_id
      where v.cliente_id = c.id
    ), '[]'::jsonb),
    'respostas_pesquisa', coalesce((
      select jsonb_agg(jsonb_build_object('pergunta', k.pergunta, 'nota', r.nota, 'respondido_em', r.created_at) order by r.created_at)
      from public.respostas_pesquisa r
      join public.campanhas_pesquisa k on k.id = r.campanha_id
      where r.cliente_id = c.id
    ), '[]'::jsonb),
    'aceites_politica', coalesce((
      select jsonb_agg(jsonb_build_object('versao', a.versao, 'aceito_em', a.aceito_em) order by a.aceito_em)
      from public.aceites_termos a
      where a.cliente_id = c.id
    ), '[]'::jsonb)
  )
  into v_resultado
  from public.clientes c
  where c.id = p_cliente_id;

  if v_resultado is not null then
    insert into public.audit_log (usuario_id, acao, tabela, registro_id, detalhes)
    values (p_admin, 'exportou_dados_titular', 'clientes', p_cliente_id::text, '{}'::jsonb);
  end if;

  return v_resultado;
end;
$$;

-- Só o servidor do portal (service_role) chama estas funções.
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.buscar_cliente_por_cpf(text)',
    'public.criar_cliente(uuid, text, text, text, text)',
    'public.importar_clientes(uuid, jsonb)',
    'public.registrar_evento(uuid, text, text, text, jsonb)',
    'public.dados_do_cliente(uuid, uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
