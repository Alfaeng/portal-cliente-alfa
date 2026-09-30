import { NextRequest, NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin-guard";
import { listarCampanhasComEstatisticas, buscarRespostasBrutas } from "@/lib/data/pesquisa";
import { gerarExcelRespostas } from "@/lib/export/xlsx";

export async function GET(request: NextRequest) {
  await exigirAdmin(["editor_completo", "administrador"]);

  const campanhaId = request.nextUrl.searchParams.get("campanha");
  const todasCampanhas = await listarCampanhasComEstatisticas();
  const campanhas = campanhaId ? todasCampanhas.filter((c) => c.id === campanhaId) : todasCampanhas;

  if (campanhas.length === 0) {
    return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  }

  const respostas = await buscarRespostasBrutas(campanhas.map((c) => c.id));
  const buffer = await gerarExcelRespostas(campanhas, respostas);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pesquisa-alfa-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
