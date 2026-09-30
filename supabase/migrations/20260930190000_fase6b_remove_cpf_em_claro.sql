-- =====================================================================
-- Fase 6 (parte B) — Remove o CPF em texto puro
-- Rollback: supabase/rollback/20260930190000_fase6b_remove_cpf_em_claro.down.sql
--
-- APLICAR SÓ DEPOIS que o código novo (que usa o hash do CPF) estiver no ar:
-- o código antigo lê a coluna `cpf`, que deixa de existir aqui.
--
-- Também: apagar um cliente passa a ser possível mesmo que ele tenha
-- respondido pesquisas. As respostas ficam no histórico, sem identificação.
-- =====================================================================

do $$
begin
  if exists (select 1 from public.clientes where cpf_hash is null or cpf_mascarado is null) then
    raise exception 'Há clientes sem hash/máscara do CPF. Aplique a parte A antes.';
  end if;
end $$;

drop trigger if exists trg_clientes_cpf on public.clientes;
drop function if exists interno.clientes_preencher_cpf();

alter table public.clientes drop column if exists cpf;
alter table public.clientes alter column cpf_hash set not null;
alter table public.clientes alter column cpf_mascarado set not null;

alter table public.respostas_pesquisa
  drop constraint if exists respostas_pesquisa_cliente_id_fkey;
alter table public.respostas_pesquisa
  add constraint respostas_pesquisa_cliente_id_fkey
  foreign key (cliente_id) references public.clientes (id) on delete set null;
