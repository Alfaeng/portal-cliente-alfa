import { NextRequest, NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth/admin-guard";
import { registrarEvento } from "@/lib/security/auditoria";
import { listarCampanhasComEstatisticas } from "@/lib/data/pesquisa";
import { gerarPdfPesquisa } from "@/lib/export/pdf";

export async function GET(request: NextRequest) {
  const usuario = await exigirAdmin(["editor_completo", "administrador"]);

  const campanhaId = request.nextUrl.searchParams.get("campanha");
  const todasCampanhas = await listarCampanhasComEstatisticas();
  const campanhas = campanhaId ? todasCampanhas.filter((c) => c.id === campanhaId) : todasCampanhas;

  if (campanhas.length === 0) {
    return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  }

  await registrarEvento(usuario.id, "exportou_pesquisa", "campanhas_pesquisa", campanhaId ?? "todas", { formato: "pdf" });

  const buffer = await gerarPdfPesquisa(campanhas);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pesquisa-alfa-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
