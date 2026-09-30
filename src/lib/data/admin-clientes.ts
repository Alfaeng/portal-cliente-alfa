import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Cliente } from "@/types/database";

export interface ClientesComVinculos {
  clientes: Cliente[];
  total: number;
  /** id do cliente → ids dos empreendimentos ligados a ele */
  vinculos: Record<string, string[]>;
}

export async function listarClientesRecentes(limite = 25): Promise<ClientesComVinculos> {
  const supabase = createSupabaseServerClient();
  const { data, count } = await supabase
    .from("clientes")
    .select("id, cpf_mascarado, nome, email, telefone, ativo, importado_em, updated_at", { count: "exact" })
    .order("importado_em", { ascending: false })
    .limit(limite);

  const clientes = data ?? [];
  const vinculos: Record<string, string[]> = {};

  if (clientes.length > 0) {
    const { data: linhas } = await supabase
      .from("cliente_empreendimentos")
      .select("cliente_id, empreendimento_id")
      .in("cliente_id", clientes.map((c) => c.id));

    for (const linha of linhas ?? []) {
      (vinculos[linha.cliente_id] ??= []).push(linha.empreendimento_id);
    }
  }

  return { clientes, total: count ?? 0, vinculos };
}
