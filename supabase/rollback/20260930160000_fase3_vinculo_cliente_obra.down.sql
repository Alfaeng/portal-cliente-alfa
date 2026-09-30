-- Desfaz supabase/migrations/20260930160000_fase3_vinculo_cliente_obra.sql
-- Atenção: apaga todos os vínculos cliente ↔ empreendimento.
drop table if exists public.cliente_empreendimentos;
