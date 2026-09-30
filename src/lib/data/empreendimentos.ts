import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Empreendimento, EmpreendimentoEtapa, Foto } from "@/types/database";
import { logErro } from "@/lib/logger";

/**
 * Empreendimentos que ESTE cliente pode ver: os ativos que estão ligados a
 * ele na tabela cliente_empreendimentos. Cliente sem vínculo não vê nenhum.
 */
export async function listarEmpreendimentosDoCliente(clienteId: string): Promise<Empreendimento[]> {
  const supabase = createSupabaseAdminClient();

  const { data: vinculos, error: erroVinculos } = await supabase
    .from("cliente_empreendimentos")
    .select("empreendimento_id")
    .eq("cliente_id", clienteId);

  if (erroVinculos) {
    logErro("listarEmpreendimentosDoCliente vínculos", erroVinculos.message);
    return [];
  }

  const ids = (vinculos ?? []).map((v) => v.empreendimento_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("empreendimentos")
    .select("*")
    .in("id", ids)
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) {
    logErro("listarEmpreendimentosDoCliente", error.message);
    return [];
  }
  return data ?? [];
}

export interface EmpreendimentoDetalhe {
  empreendimento: Empreendimento;
  etapasVisiveis: EmpreendimentoEtapa[];
  fotos: Foto[];
}

export async function buscarEmpreendimentoPorSlug(
  slug: string,
  clienteId: string
): Promise<EmpreendimentoDetalhe | null> {
  const supabase = createSupabaseAdminClient();

  const { data: empreendimento, error } = await supabase
    .from("empreendimentos")
    .select("*")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  if (error || !empreendimento) return null;

  // Autorização: o cliente só abre obras ligadas a ele. Para quem não tem
  // vínculo, a resposta é a mesma de "obra que não existe".
  const { data: vinculo } = await supabase
    .from("cliente_empreendimentos")
    .select("empreendimento_id")
    .eq("cliente_id", clienteId)
    .eq("empreendimento_id", empreendimento.id)
    .maybeSingle();

  if (!vinculo) return null;

  const { data: etapas, error: etapasError } = await supabase
    .from("empreendimento_etapas")
    .select("*")
    .eq("empreendimento_id", empreendimento.id)
    .order("ordem", { ascending: true });

  // Busca as fotos SEM encadear .order()/.is() na mesma query — essa
  // combinação com .eq() estava truncando o resultado para 1 linha só
  // neste cliente (confirmado: a mesma consulta sem .order() retornava
  // as 33 linhas certas). Ordenar e filtrar deleted_at em JS evita o
  // problema por completo.
  const { data: fotosTodas, error: fotosError } = await supabase
    .from("fotos")
    .select("*")
    .eq("empreendimento_id", empreendimento.id);

  if (etapasError) logErro("buscarEmpreendimentoPorSlug etapas:", etapasError);
  if (fotosError) logErro("buscarEmpreendimentoPorSlug fotos:", fotosError);

  const fotos = (fotosTodas ?? [])
    .filter((f) => !f.deleted_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Etapas em 0% ficam ocultas do cliente — aparecem sozinhas quando a
  // obra chegar nelas (percentual > 0 lançado pelo admin).
  const etapasVisiveis = (etapas ?? []).filter((e) => e.percentual > 0);

  return { empreendimento, etapasVisiveis, fotos };
}
