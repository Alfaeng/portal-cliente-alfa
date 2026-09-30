-- Desfaz supabase/migrations/20260930180000_fase6a_lgpd_cpf_auditoria.sql
--
-- ATENÇÃO:
--  * A chave 'cpf_pepper' do Vault NÃO é apagada de propósito: se algum dia
--    a parte A for reaplicada, os hashes antigos continuam válidos.
--  * Só desfaça a parte A se a parte B (remoção da coluna cpf) NÃO foi
--    aplicada — depois dela, o CPF em texto puro já não existe.
--  * Clientes criados depois da parte A podem ter cpf nulo; por isso a
--    coluna cpf NÃO volta a ser NOT NULL aqui.

drop function if exists public.dados_do_cliente(uuid, uuid);
drop function if exists public.registrar_evento(uuid, text, text, text, jsonb);
drop function if exists public.importar_clientes(uuid, jsonb);
drop function if exists public.criar_cliente(uuid, text, text, text, text);
drop function if exists public.buscar_cliente_por_cpf(text);

drop table if exists public.aceites_termos;

drop trigger if exists trg_audit_cliente_empreendimentos on public.cliente_empreendimentos;
drop trigger if exists trg_audit_usuarios_admin on public.usuarios_admin;
drop trigger if exists trg_audit_clientes on public.clientes;
drop function if exists interno.registrar_auditoria();
drop table if exists public.audit_log;

drop index if exists public.clientes_cpf_hash_key;
drop trigger if exists trg_clientes_cpf on public.clientes;
drop function if exists interno.clientes_preencher_cpf();
alter table public.clientes drop column if exists cpf_mascarado;
alter table public.clientes drop column if exists cpf_hash;

drop function if exists interno.mascarar_cpf(text);
drop function if exists interno.hash_cpf(text);
