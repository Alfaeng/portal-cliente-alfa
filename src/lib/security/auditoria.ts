import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logErro } from "@/lib/logger";

/**
 * Registra no histórico de auditoria (public.audit_log) uma ação sensível
 * feita por um administrador, como exportar dados. Nunca grave dados
 * pessoais em `detalhes`: só quem fez, o quê e onde.
 */
export async function registrarEvento(
  usuarioId: string,
  acao: string,
  tabela: string,
  registroId: string,
  detalhes: Record<string, string | number | boolean> = {}
): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("registrar_evento", {
      p_usuario: usuarioId,
      p_acao: acao,
      p_tabela: tabela,
      p_registro: registroId,
      p_detalhes: detalhes,
    });
    if (error) logErro("auditoria: não foi possível registrar o evento", error.message);
  } catch (err) {
    logErro("auditoria: falha inesperada", err);
  }
}
