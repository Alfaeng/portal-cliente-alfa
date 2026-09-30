-- Desfaz supabase/migrations/20260930150000_fase2_rate_limit.sql
drop function if exists public.limpar_rate_limit();
drop function if exists public.verificar_rate_limit(text, int, int);
drop table if exists public.rate_limit;
