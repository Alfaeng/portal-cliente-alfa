import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { CampanhaComEstatisticas } from "@/types/database";
import { formatPeriodo } from "@/lib/utils";

const NAVY = rgb(15 / 255, 32 / 255, 68 / 255);
const GOLD = rgb(201 / 255, 162 / 255, 75 / 255);
const MUTED = rgb(122 / 255, 127 / 255, 135 / 255);
const LINE = rgb(227 / 255, 229 / 255, 233 / 255);

/**
 * As fontes padrão do PDF (Helvetica) só codificam o alfabeto latino
 * (WinAnsi). Qualquer outro caractere — emoji, estrela ★, aspas especiais —
 * faz a geração do PDF falhar. Aqui trocamos o que a fonte não suporta por "?".
 */
function textoSeguro(fonte: PDFFont, texto: string): string {
  const suportados = new Set(fonte.getCharacterSet());
  return Array.from(texto)
    .map((c) => (suportados.has(c.codePointAt(0)!) ? c : "?"))
    .join("");
}

/**
 * Gera um PDF com o resumo de cada campanha de pesquisa (pergunta,
 * período, nota média e distribuição de estrelas em barras) — pronto
 * para levar à diretoria.
 */
export async function gerarPdfPesquisa(campanhas: CampanhaComEstatisticas[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 48;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  page.drawText("Alfa Engenharia", { x: margin, y, size: 11, font: fontBold, color: GOLD });
  y -= 20;
  page.drawText("Pesquisa de satisfação — relatório de campanhas", {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: NAVY,
  });
  y -= 16;
  page.drawText(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, {
    x: margin,
    y,
    size: 9,
    font,
    color: MUTED,
  });
  y -= 30;

  for (const campanha of campanhas) {
    ensureSpace(170);

    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: LINE,
    });
    y -= 22;

    page.drawText(textoSeguro(fontBold, campanha.pergunta), { x: margin, y, size: 13, font: fontBold, color: NAVY });
    const statusLabel = campanha.status === "ativa" ? "No ar" : "Pausada";
    page.drawText(statusLabel, {
      x: pageWidth - margin - font.widthOfTextAtSize(statusLabel, 9) - 4,
      y: y + 2,
      size: 9,
      font,
      color: campanha.status === "ativa" ? NAVY : MUTED,
    });
    y -= 16;

    page.drawText(
      `${formatPeriodo(campanha.periodo_inicio, campanha.periodo_fim)} · ${campanha.total_respostas} respostas`,
      { x: margin, y, size: 9.5, font, color: MUTED }
    );
    y -= 28;

    // Nota média em destaque
    page.drawText(campanha.media.toFixed(1), { x: margin, y: y - 18, size: 30, font: fontBold, color: NAVY });
    page.drawText("média", { x: margin, y: y - 32, size: 8, font, color: MUTED });

    // Barras de distribuição 1..5 estrelas
    const barsX = margin + 90;
    const barsWidth = pageWidth - margin - barsX - 10;
    const maxCount = Math.max(...campanha.distribuicao, 1);
    const rowHeight = 16;

    campanha.distribuicao.forEach((count, idx) => {
      const rowY = y - idx * rowHeight;
      const estrela = idx + 1;
      page.drawText(`${estrela} ${estrela === 1 ? "estrela" : "estrelas"}`, { x: barsX, y: rowY - 10, size: 8.5, font, color: MUTED });

      const trackX = barsX + 46;
      const trackWidth = barsWidth - 46 - 30;
      page.drawRectangle({
        x: trackX,
        y: rowY - 12,
        width: trackWidth,
        height: 7,
        color: LINE,
      });
      const fillWidth = (count / maxCount) * trackWidth;
      page.drawRectangle({
        x: trackX,
        y: rowY - 12,
        width: Math.max(fillWidth, count > 0 ? 2 : 0),
        height: 7,
        color: estrela === 5 ? GOLD : NAVY,
      });
      page.drawText(String(count), {
        x: trackX + trackWidth + 8,
        y: rowY - 11,
        size: 8.5,
        font,
        color: MUTED,
      });
    });

    y -= rowHeight * 5 + 24;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
