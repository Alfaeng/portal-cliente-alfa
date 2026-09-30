-- =====================================================================
-- Fase 3 — Vínculo entre cliente e empreendimento
--
-- Cada cliente só enxerga no portal os empreendimentos ligados a ele nesta
-- tabela. Cliente sem vínculo não vê nenhuma obra (privacidade por padrão).
-- =====================================================================

create table if not exists public.cliente_empreendimentos (
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cliente_id, empreendimento_id)
);

create index if not exists cliente_empreendimentos_obra_idx
  on public.cliente_empreendimentos (empreendimento_id);

comment on table public.cliente_empreendimentos is 'Quais empreendimentos cada cliente pode ver no portal. Sem linha = sem acesso àquela obra.';

alter table public.cliente_empreendimentos enable row level security;

-- Só administrador gerencia os vínculos pelo painel (igual à tabela clientes).
create policy cliente_empreendimentos_admin on public.cliente_empreendimentos
  for all to authenticated
  using ((select public.nivel_acesso_atual()) = 'administrador')
  with check ((select public.nivel_acesso_atual()) = 'administrador');
