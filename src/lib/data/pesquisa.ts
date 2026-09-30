import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CampanhaComEstatisticas, CampanhaPesquisa } from "@/types/database";

export async function buscarCampanhaAtiva(): Promise<CampanhaPesquisa | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("campanhas_pesquisa")
    .select("*")
    .eq("status", "ativa")
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export type ResultadoResposta = "ok" | "ja_respondeu" | "erro";

export async function registrarResposta(
  campanhaId: string,
  nota: number,
  clienteId: string
): Promise<ResultadoResposta> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("respostas_pesquisa")
    .insert({ campanha_id: campanhaId, nota, cliente_id: clienteId });

  if (!error) return "ok";
  // 23505 = violação de unicidade: o cliente já respondeu esta campanha.
  if (error.code === "23505") return "ja_respondeu";
  return "erro";
}

export async function clienteJaRespondeu(campanhaId: string, clienteId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { count } = await supabase
    .from("respostas_pesquisa")
    .select("id", { count: "exact", head: true })
    .eq("campanha_id", campanhaId)
    .eq("cliente_id", clienteId);
  return (count ?? 0) > 0;
}

export async function calcularEstatisticasCampanha(
  campanha: CampanhaPesquisa
): Promise<CampanhaComEstatisticas> {
  const supabase = createSupabaseAdminClient();
  const { data: respostas } = await supabase
    .from("respostas_pesquisa")
    .select("nota")
    .eq("campanha_id", campanha.id);

  const distribuicao: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let soma = 0;
  for (const r of respostas ?? []) {
    distribuicao[r.nota - 1] += 1;
    soma += r.nota;
  }
  const total = respostas?.length ?? 0;

  return {
    ...campanha,
    total_respostas: total,
    media: total > 0 ? soma / total : 0,
    distribuicao,
  };
}

export async function listarCampanhasComEstatisticas(): Promise<CampanhaComEstatisticas[]> {
  const supabase = createSupabaseAdminClient();
  const { data: campanhas } = await supabase
    .from("campanhas_pesquisa")
    .select("*")
    .order("periodo_inicio", { ascending: true });

  if (!campanhas) return [];

  return Promise.all(campanhas.map((c) => calcularEstatisticasCampanha(c)));
}

export async function buscarRespostasBrutas(
  campanhaIds: string[]
): Promise<Record<string, import("@/types/database").RespostaPesquisaComCliente[]>> {
  const supabase = createSupabaseAdminClient();
  // Traz o nome/CPF do cliente junto (join embutido) para o relatório
  // mostrar quem deu cada nota. Sem .order() nesta consulta — encadear
  // .order() com filtro nesta mesma tabela via este cliente já truncou
  // resultados antes (ver lição em fotos/etapas); aqui é só .in().
  const { data } = await supabase
    .from("respostas_pesquisa")
    .select("*, cliente:clientes(nome, cpf_mascarado)")
    .in("campanha_id", campanhaIds);

  const agrupado: Record<string, import("@/types/database").RespostaPesquisaComCliente[]> = {};
  for (const resposta of data ?? []) {
    if (!agrupado[resposta.campanha_id]) agrupado[resposta.campanha_id] = [];
    agrupado[resposta.campanha_id].push(resposta as import("@/types/database").RespostaPesquisaComCliente);
  }
  return agrupado;
}
