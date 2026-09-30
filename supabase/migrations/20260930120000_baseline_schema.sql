-- =====================================================================
-- Portal do Cliente Alfa — schema Supabase (Postgres)
-- Alfa Engenharia · São Luís/MA
-- Rode este arquivo no SQL Editor do Supabase (ou via `supabase db push`)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- usuarios_admin
-- Um registro por pessoa com acesso à área administrativa.
-- O id É o mesmo id de auth.users (Supabase Auth, e-mail + senha).
-- ---------------------------------------------------------------------
create table if not exists public.usuarios_admin (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  nivel_acesso text not null check (nivel_acesso in ('editor_obras', 'editor_completo', 'administrador')),
  convite_status text not null default 'pendente' check (convite_status in ('pendente', 'ativo')),
  convidado_por uuid references public.usuarios_admin (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.usuarios_admin is 'Funcionários com acesso à área /admin. Autenticação via Supabase Auth (e-mail+senha).';

-- ---------------------------------------------------------------------
-- clientes
-- Base importada do Sienge via CSV (cpf, nome, email, telefone).
-- Usada apenas como "porteira" no login por CPF do portal do cliente.
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  cpf text not null unique,
  nome text not null,
  email text,
  telefone text,
  ativo boolean not null default true,
  importado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clientes_cpf_idx on public.clientes (cpf);

comment on table public.clientes is 'Base de clientes importada do Sienge via CSV. O CPF só confirma identidade — nenhum dado de contrato fica aqui.';

-- ---------------------------------------------------------------------
-- empreendimentos
-- ---------------------------------------------------------------------
create table if not exists public.empreendimentos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  bairro text not null,
  cidade text not null default 'São Luís',
  estado text not null default 'MA',
  logo_url text,
  texto_atualizacao text not null default '',
  avanco_geral numeric(5, 2) not null default 0 check (avanco_geral >= 0 and avanco_geral <= 100),
  atualizado_em date not null default current_date,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.empreendimentos.avanco_geral is 'Percentual digitado pelo admin (vem do relatório do Sienge, com peso por etapa). NÃO é calculado a partir das etapas.';

-- ---------------------------------------------------------------------
-- empreendimento_etapas
-- Etapas em 0% ficam ocultas para o cliente (filtradas na consulta/app).
-- ---------------------------------------------------------------------
create table if not exists public.empreendimento_etapas (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  nome text not null,
  percentual numeric(5, 2) not null default 0 check (percentual >= 0 and percentual <= 100),
  ordem int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists etapas_empreendimento_idx on public.empreendimento_etapas (empreendimento_id);

-- ---------------------------------------------------------------------
-- fotos
-- Soft-delete: ao subir fotos novas, as antigas recebem deleted_at
-- e ficam recuperáveis por ~30 dias (purga definitiva via job agendado).
-- ---------------------------------------------------------------------
create table if not exists public.fotos (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  storage_path text not null,
  url text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists fotos_empreendimento_idx on public.fotos (empreendimento_id) where deleted_at is null;
create index if not exists fotos_deleted_idx on public.fotos (deleted_at) where deleted_at is not null;

comment on column public.fotos.deleted_at is 'Soft-delete. Fotos com deleted_at preenchido há mais de 30 dias podem ser purgadas definitivamente.';

-- ---------------------------------------------------------------------
-- campanhas_pesquisa
-- Cada pergunta é uma campanha. Pode ser pausada e reativada; ao
-- reativar, volta ao banner e continua somando no MESMO histórico.
-- ---------------------------------------------------------------------
create table if not exists public.campanhas_pesquisa (
  id uuid primary key default gen_random_uuid(),
  pergunta text not null,
  status text not null default 'ativa' check (status in ('ativa', 'pausada')),
  oculta boolean not null default false,
  periodo_inicio date not null default current_date,
  periodo_fim date,
  created_by uuid references public.usuarios_admin (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.campanhas_pesquisa.oculta is 'Campanha pausada que o admin tirou da lista principal (standby). Não apaga nada — reexibir traz de volta.';

comment on table public.campanhas_pesquisa is 'Uma pergunta de pesquisa = uma campanha. Pausar preserva o histórico; reativar soma respostas no mesmo histórico.';

-- Garante no máximo uma campanha "ativa" por vez (a que aparece no banner do cliente).
create unique index if not exists campanhas_uma_ativa_idx on public.campanhas_pesquisa ((status)) where status = 'ativa';

-- ---------------------------------------------------------------------
-- respostas_pesquisa
-- ---------------------------------------------------------------------
create table if not exists public.respostas_pesquisa (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.campanhas_pesquisa (id) on delete cascade,
  cliente_id uuid references public.clientes (id),
  nota int not null check (nota between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists respostas_campanha_idx on public.respostas_pesquisa (campanha_id);

-- =====================================================================
-- Funções auxiliares para RLS
-- =====================================================================

create or replace function public.nivel_acesso_atual()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select nivel_acesso from public.usuarios_admin where id = auth.uid();
$$;

create or replace function public.eh_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.usuarios_admin where id = auth.uid());
$$;

-- =====================================================================
-- RLS
-- =====================================================================

alter table public.usuarios_admin enable row level security;
alter table public.clientes enable row level security;
alter table public.empreendimentos enable row level security;
alter table public.empreendimento_etapas enable row level security;
alter table public.fotos enable row level security;
alter table public.campanhas_pesquisa enable row level security;
alter table public.respostas_pesquisa enable row level security;

-- usuarios_admin: qualquer admin autenticado pode ver a lista; só
-- 'administrador' cria/edita/remove acessos. Cada um pode ver o próprio registro.
drop policy if exists usuarios_admin_select on public.usuarios_admin;
create policy usuarios_admin_select on public.usuarios_admin
  for select using (public.eh_admin());

drop policy if exists usuarios_admin_write on public.usuarios_admin;
create policy usuarios_admin_write on public.usuarios_admin
  for all using (public.nivel_acesso_atual() = 'administrador')
  with check (public.nivel_acesso_atual() = 'administrador');

-- clientes: só 'administrador' acessa a base de clientes pelo painel.
-- (O login por CPF do cliente passa pela edge function com service role,
-- que não é afetada por RLS.)
drop policy if exists clientes_admin on public.clientes;
create policy clientes_admin on public.clientes
  for all using (public.nivel_acesso_atual() = 'administrador')
  with check (public.nivel_acesso_atual() = 'administrador');

-- empreendimentos / etapas / fotos: leitura para qualquer admin autenticado;
-- escrita para editor_obras, editor_completo ou administrador.
drop policy if exists empreendimentos_select on public.empreendimentos;
create policy empreendimentos_select on public.empreendimentos
  for select using (public.eh_admin());

drop policy if exists empreendimentos_write on public.empreendimentos;
create policy empreendimentos_write on public.empreendimentos
  for all using (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'))
  with check (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'));

drop policy if exists etapas_select on public.empreendimento_etapas;
create policy etapas_select on public.empreendimento_etapas
  for select using (public.eh_admin());

drop policy if exists etapas_write on public.empreendimento_etapas;
create policy etapas_write on public.empreendimento_etapas
  for all using (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'))
  with check (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'));

drop policy if exists fotos_select on public.fotos;
create policy fotos_select on public.fotos
  for select using (public.eh_admin());

drop policy if exists fotos_write on public.fotos;
create policy fotos_write on public.fotos
  for all using (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'))
  with check (public.nivel_acesso_atual() in ('editor_obras', 'editor_completo', 'administrador'));

-- campanhas / respostas: leitura e escrita para editor_completo ou administrador.
drop policy if exists campanhas_rw on public.campanhas_pesquisa;
create policy campanhas_rw on public.campanhas_pesquisa
  for all using (public.nivel_acesso_atual() in ('editor_completo', 'administrador'))
  with check (public.nivel_acesso_atual() in ('editor_completo', 'administrador'));

drop policy if exists respostas_rw on public.respostas_pesquisa;
create policy respostas_rw on public.respostas_pesquisa
  for all using (public.nivel_acesso_atual() in ('editor_completo', 'administrador'))
  with check (public.nivel_acesso_atual() in ('editor_completo', 'administrador'));

-- Observação: todas as leituras/escritas usadas pelo Portal do Cliente
-- (CPF, empreendimentos, etapas, fotos, resposta de pesquisa) acontecem
-- no servidor Next.js com a service role key, que ignora RLS por
-- desenho do Supabase. O RLS acima protege o acesso direto via
-- anon/authenticated key (ex.: painel admin autenticado via Supabase Auth).

-- =====================================================================
-- Trigger: cria/atualiza usuarios_admin.convite_status quando o
-- convidado confirma o e-mail (define a própria senha).
-- =====================================================================
create or replace function public.marcar_convite_ativo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.usuarios_admin
    set convite_status = 'ativo', updated_at = now()
    where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.marcar_convite_ativo();

-- =====================================================================
-- updated_at automático
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_empreendimentos_updated on public.empreendimentos;
create trigger trg_empreendimentos_updated before update on public.empreendimentos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_clientes_updated on public.clientes;
create trigger trg_clientes_updated before update on public.clientes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_usuarios_admin_updated on public.usuarios_admin;
create trigger trg_usuarios_admin_updated before update on public.usuarios_admin
  for each row execute function public.set_updated_at();

drop trigger if exists trg_campanhas_updated on public.campanhas_pesquisa;
create trigger trg_campanhas_updated before update on public.campanhas_pesquisa
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Purga de fotos com soft-delete há mais de 30 dias.
-- Agende com pg_cron (extensão disponível no Supabase):
--   select cron.schedule('purgar-fotos-obra', '0 3 * * *',
--     $$ select public.purgar_fotos_excluidas(); $$);
-- Isso remove as linhas de public.fotos; os arquivos no Storage podem
-- ser removidos separadamente com uma Edge Function agendada (o SQL
-- abaixo não deleta objetos do Storage, só o registro na tabela).
-- =====================================================================
create or replace function public.purgar_fotos_excluidas()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.fotos
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
$$;
