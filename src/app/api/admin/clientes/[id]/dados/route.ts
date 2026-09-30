import { NextResponse, type NextRequest } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { idSchema } from "@/lib/validation";

/**
 * Direito de acesso do titular (LGPD, art. 18): baixa, em um único arquivo,
 * tudo o que a Alfa guarda sobre um cliente. Só administrador; a consulta é
 * registrada no histórico de auditoria.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirAdmin(["administrador"]);

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("dados_do_cliente", {
    p_admin: usuario.id,
    p_cliente_id: id.data,
  });

  if (error) {
    console.error("dados_do_cliente", error.message);
    return NextResponse.json({ error: "Não foi possível gerar o arquivo." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const arquivo = { gerado_em: new Date().toISOString(), ...data };
  return new NextResponse(JSON.stringify(arquivo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dados-cliente-${id.data.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
