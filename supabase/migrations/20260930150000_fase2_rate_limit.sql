-- =====================================================================
-- Fase 2 — Limite de tentativas (rate limit) para os logins
-- Rollback: supabase/rollback/20260930150000_fase2_rate_limit.down.sql
--
-- Cada "chave" (ex.: 'login_cpf:<hash>' ou 'login_admin_ip:<ip>') conta
-- quantas tentativas aconteceram dentro de uma janela de tempo. A função
-- devolve false quando o limite é ultrapassado. Só o servidor do portal
-- (service role) consegue chamá-la.
-- =====================================================================

create table if not exists public.rate_limit (
  chave text primary key,
  tentativas int not null default 0,
  janela_inicio timestamptz not null default now()
);

create index if not exists rate_limit_janela_idx on public.rate_limit (janela_inicio);

comment on table public.rate_limit is 'Contador de tentativas de login por chave (IP, CPF em hash, e-mail). Acesso apenas pelo servidor.';

alter table public.rate_limit enable row level security;

-- Ninguém que use a API pública lê ou grava aqui.
create policy rate_limit_sem_acesso on public.rate_limit
  for all to anon, authenticated
  using (false) with check (false);

create or replace function public.verificar_rate_limit(
  p_chave text,
  p_limite int,
  p_janela_segundos int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tentativas int;
begin
  insert into public.rate_limit as r (chave, tentativas, janela_inicio)
  values (p_chave, 1, now())
  on conflict (chave) do update set
    tentativas = case
      when r.janela_inicio < now() - make_interval(secs => p_janela_segundos) then 1
      else r.tentativas + 1
    end,
    janela_inicio = case
      when r.janela_inicio < now() - make_interval(secs => p_janela_segundos) then now()
      else r.janela_inicio
    end
  returning tentativas into v_tentativas;

  return v_tentativas <= p_limite;
end;
$$;

revoke execute on function public.verificar_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.verificar_rate_limit(text, int, int) to service_role;

-- Limpeza de contadores antigos (agendar com pg_cron na fase 7).
create or replace function public.limpar_rate_limit()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rate_limit where janela_inicio < now() - interval '1 day';
$$;

revoke execute on function public.limpar_rate_limit() from public, anon, authenticated;
grant execute on function public.limpar_rate_limit() to service_role;
