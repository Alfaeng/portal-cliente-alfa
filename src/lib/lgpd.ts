import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Versão atual da Política de Privacidade e dos Termos de Uso. Ao mudar o
 * texto de forma relevante, troque esta data: todos os clientes passam a ver
 * o aviso de novo e o aceite anterior continua registrado no histórico.
 */
export const VERSAO_POLITICA = "2026-10-01";

/**
 * O cliente já tomou ciência da versão atual? Se o banco falhar, libera o
 * acesso (e registra o erro) em vez de trancar todos os clientes para fora.
 */
export async function clienteAceitouPolitica(clienteId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { count, error } = await supabase
      .from("aceites_termos")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", clienteId)
      .eq("versao", VERSAO_POLITICA);
    if (error) {
      console.error("lgpd: erro ao consultar aceite", error.message);
      return true;
    }
    return (count ?? 0) > 0;
  } catch (err) {
    console.error("lgpd: falha inesperada ao consultar aceite", err);
    return true;
  }
}
