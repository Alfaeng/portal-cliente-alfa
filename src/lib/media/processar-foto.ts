import sharp from "sharp";
import heicConvert from "heic-convert";

export type TipoImagem = "jpeg" | "png" | "webp" | "heic";

/** Limite por arquivo: a Vercel recusa requisições acima de ~4,5 MB. */
export const TAMANHO_MAXIMO_FOTO = 4 * 1024 * 1024;

const LADO_MAXIMO = 2400;

/**
 * Descobre o tipo REAL da imagem pelos primeiros bytes do arquivo. A
 * extensão e o tipo informado pelo navegador não são confiáveis: qualquer
 * um pode renomear um arquivo qualquer para .jpg.
 */
export function detectarTipoImagem(bytes: Uint8Array): TipoImagem | null {
  if (bytes.length < 12) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";

  const pngAssinatura = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngAssinatura.every((b, i) => bytes[i] === b)) return "png";

  const texto = (inicio: number, fim: number) => String.fromCharCode(...bytes.slice(inicio, fim));
  if (texto(0, 4) === "RIFF" && texto(8, 12) === "WEBP") return "webp";

  // HEIC/HEIF: caixa "ftyp" nos bytes 4–8 e uma marca compatível logo depois.
  if (texto(4, 8) === "ftyp") {
    const marca = texto(8, 12);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(marca)) return "heic";
  }

  return null;
}

/**
 * Prepara a foto para publicação: converte HEIC para JPEG, corrige a
 * rotação, limita o tamanho e REMOVE os metadados (EXIF, incluindo a
 * localização GPS de onde a foto foi tirada). O resultado é sempre JPEG.
 */
export async function processarFoto(entrada: Buffer, tipo: TipoImagem): Promise<Buffer> {
  let origem: Buffer = entrada;

  if (tipo === "heic") {
    const convertido = await heicConvert({ buffer: new Uint8Array(entrada), format: "JPEG", quality: 0.9 });
    origem = Buffer.from(convertido);
  }

  return sharp(origem, { failOn: "error" })
    .rotate() // aplica a orientação do EXIF antes de descartá-lo
    .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer(); // sem withMetadata(): nenhum metadado é preservado
}
