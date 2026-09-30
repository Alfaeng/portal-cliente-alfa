import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logErro } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Verificação de saúde para monitores de disponibilidade (UptimeRobot,
 * Better Stack etc.): responde 200 quando o site e o banco estão de pé e 503
 * quando o banco não responde. Não expõe nenhum dado.
 */
export async function GET() {
  const inicio = Date.now();
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("empreendimentos").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw new Error(error.message);

    return NextResponse.json(
      {
        status: "ok",
        banco: "ok",
        latencia_banco_ms: Date.now() - inicio,
        versao: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logErro("saude: banco indisponível", err);
    return NextResponse.json(
      { status: "erro", banco: "falha" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
