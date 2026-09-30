import { createHash } from "crypto";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logErro } from "@/lib/logger";

/**
 * Limite de tentativas (rate limit) apoiado na função
 * public.verificar_rate_limit do banco. Devolve `true` quando a tentativa
 * está dentro do limite e `false` quando deve ser bloqueada.
 *
 * Se o banco estiver indisponível, a tentativa é liberada (falha aberta) e o
 * erro vai para o log — melhor do que trancar todo mundo para fora.
 */
export async function dentroDoLimite(
  chave: string,
  limite: number,
  janelaSegundos: number
): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("verificar_rate_limit", {
      p_chave: chave,
      p_limite: limite,
      p_janela_segundos: janelaSegundos,
    });
    if (error) {
      logErro("rate-limit: erro ao consultar o banco", error.message);
      return true;
    }
    return data === true;
  } catch (err) {
    logErro("rate-limit: falha inesperada", err);
    return true;
  }
}

/** Guarda só o "hash" do valor, para não gravar CPF ou e-mail em claro. */
export function hashParaChave(valor: string): string {
  return createHash("sha256").update(valor.trim().toLowerCase()).digest("hex").slice(0, 32);
}

/** IP de quem fez a requisição (a Vercel preenche esses cabeçalhos). */
export async function ipDaRequisicao(): Promise<string> {
  const h = await headers();
  const encaminhado = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado || h.get("x-real-ip") || "desconhecido";
}
