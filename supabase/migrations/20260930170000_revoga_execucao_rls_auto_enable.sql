-- =====================================================================
-- Revoga a execução pública de public.rls_auto_enable()
-- Rollback: supabase/rollback/20260930170000_revoga_execucao_rls_auto_enable.down.sql
--
-- É a função do gatilho "ensure_rls" (liga a RLS sozinha em tabelas novas),
-- criada pelo recurso do próprio Supabase. Um gatilho de evento não precisa
-- de EXECUTE para os papéis da API, e deixá-lo aberto gera alerta de
-- segurança (visitantes veriam a função em /rest/v1/rpc). O gatilho
-- continua funcionando normalmente.
-- =====================================================================

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
