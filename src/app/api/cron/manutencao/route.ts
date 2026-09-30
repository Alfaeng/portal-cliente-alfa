import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logErro, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DIAS_ATE_PURGAR_FOTO = 30;
const LOTE = 200;

/**
 * Manutenção diária (agendada em vercel.json, às 06:00 UTC = 03:00 em São Luís):
 *  1. Apaga de vez as fotos removidas há mais de 30 dias: o arquivo no
 *     armazenamento E o registro no banco (antes ficavam arquivos órfãos).
 *  2. Limpa os contadores antigos do limite de tentativas de login.
 *
 * Protegida: só responde a quem envia "Authorization: Bearer <CRON_SECRET>".
 * A Vercel envia isso sozinha quando a variável CRON_SECRET existe.
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    return NextResponse.json({ error: "Rotina desativada: defina CRON_SECRET." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const resultado = { fotos_apagadas: 0, fotos_com_falha: 0, contadores_limpos: false };

  // --- 1. Fotos removidas há mais de 30 dias ---
  const limite = new Date(Date.now() - DIAS_ATE_PURGAR_FOTO * 24 * 60 * 60 * 1000).toISOString();
  const { data: fotos, error: erroBusca } = await supabase
    .from("fotos")
    .select("id, storage_path")
    .not("deleted_at", "is", null)
    .lt("deleted_at", limite)
    .limit(LOTE);

  if (erroBusca) {
    logErro("manutencao: falha ao listar fotos antigas", erroBusca.message);
  } else if (fotos && fotos.length > 0) {
    // Só apaga o registro se o arquivo foi removido; se falhar, tenta de novo amanhã.
    const { error: erroArquivos } = await supabase.storage
      .from("obras")
      .remove(fotos.map((f) => f.storage_path));

    if (erroArquivos) {
      logErro("manutencao: falha ao remover arquivos", erroArquivos.message);
      resultado.fotos_com_falha = fotos.length;
    } else {
      const { error: erroRegistros } = await supabase
        .from("fotos")
        .delete()
        .in("id", fotos.map((f) => f.id));
      if (erroRegistros) {
        logErro("manutencao: falha ao apagar registros", erroRegistros.message);
        resultado.fotos_com_falha = fotos.length;
      } else {
        resultado.fotos_apagadas = fotos.length;
      }
    }
  }

  // --- 2. Contadores antigos do limite de tentativas ---
  const { error: erroLimpeza } = await supabase.rpc("limpar_rate_limit");
  if (erroLimpeza) logErro("manutencao: falha ao limpar contadores", erroLimpeza.message);
  else resultado.contadores_limpos = true;

  // Se algo falhou, responde com erro: assim a Vercel mostra a rotina como "falhou".
  const ok = !erroBusca && resultado.fotos_com_falha === 0 && resultado.contadores_limpos;
  logInfo(ok ? "manutencao concluída" : "manutencao concluída com falhas", JSON.stringify(resultado));
  return NextResponse.json({ ok, ...resultado }, { status: ok ? 200 : 500 });
}
