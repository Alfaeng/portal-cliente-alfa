import ExcelJS from "exceljs";
import { neutralizarFormula } from "@/lib/security/sanitize";
import type { CampanhaPesquisa, RespostaPesquisaComCliente } from "@/types/database";

/**
 * Gera um .xlsx com os dados brutos das respostas de uma (ou mais)
 * campanhas de pesquisa de satisfação.
 */
export async function gerarExcelRespostas(
  campanhas: CampanhaPesquisa[],
  respostasPorCampanha: Record<string, RespostaPesquisaComCliente[]>
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const sheet = wb.addWorksheet("Respostas");
  sheet.columns = [
    { header: "Pergunta", key: "pergunta", width: 40 },
    { header: "Periodo_Inicio", key: "inicio", width: 14 },
    { header: "Periodo_Fim", key: "fim", width: 14 },
    { header: "Status", key: "status", width: 10 },
    { header: "Cliente", key: "cliente", width: 26 },
    { header: "CPF_Mascarado", key: "cpf", width: 16 },
    { header: "Nota", key: "nota", width: 8 },
    { header: "Data_Resposta", key: "data", width: 20 },
  ];

  let total = 0;
  for (const campanha of campanhas) {
    for (const resposta of respostasPorCampanha[campanha.id] ?? []) {
      sheet.addRow({
        pergunta: neutralizarFormula(campanha.pergunta),
        inicio: campanha.periodo_inicio,
        fim: campanha.periodo_fim ?? "",
        status: campanha.status,
        cliente: neutralizarFormula(resposta.cliente?.nome ?? "(não identificado)"),
        cpf: resposta.cliente?.cpf_mascarado ?? "",
        nota: resposta.nota,
        data: new Date(resposta.created_at).toLocaleString("pt-BR"),
      });
      total += 1;
    }
  }
  if (total === 0) sheet.addRow({ pergunta: "Nenhuma resposta neste período" });

  const resumo = wb.addWorksheet("Resumo");
  resumo.columns = [
    { header: "Pergunta", key: "pergunta", width: 40 },
    { header: "Status", key: "status", width: 10 },
    { header: "Total_Respostas", key: "total", width: 16 },
    { header: "Media", key: "media", width: 8 },
  ];
  for (const c of campanhas) {
    const respostas = respostasPorCampanha[c.id] ?? [];
    const media =
      respostas.length > 0 ? respostas.reduce((acc, r) => acc + r.nota, 0) / respostas.length : 0;
    resumo.addRow({
      pergunta: neutralizarFormula(c.pergunta),
      status: c.status,
      total: respostas.length,
      media: Number(media.toFixed(2)),
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
