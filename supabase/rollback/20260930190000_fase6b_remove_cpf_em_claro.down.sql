-- Desfaz supabase/migrations/20260930190000_fase6b_remove_cpf_em_claro.sql
--
-- ATENÇÃO: o CPF em texto puro foi APAGADO na parte B e NÃO tem como ser
-- recuperado daqui (o hash é de mão única). Este script só recria a estrutura:
-- a coluna cpf volta vazia. Para reaver os CPFs, use um backup anterior ou
-- reimporte a planilha do Sienge.

alter table public.respostas_pesquisa
  drop constraint if exists respostas_pesquisa_cliente_id_fkey;
alter table public.respostas_pesquisa
  add constraint respostas_pesquisa_cliente_id_fkey
  foreign key (cliente_id) references public.clientes (id);

alter table public.clientes add column if not exists cpf text;
alter table public.clientes alter column cpf_hash drop not null;
alter table public.clientes alter column cpf_mascarado drop not null;
