import { z } from "zod";

export interface DestaquePost {
  id: number;
  titulo: string;
  data: string;
  link: string;
  imagem: string | null;
}

const WP_HOST = "alfaengenhariama.com.br";
const WP_ENDPOINT = `https://${WP_HOST}/wp-json/wp/v2/posts?per_page=3&_embed`;

/** Só aceita links https do próprio site da Alfa (nada de javascript:, http: ou outros domínios). */
function urlDoSiteDaAlfa(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  try {
    const url = new URL(valor);
    const dominioOk = url.hostname === WP_HOST || url.hostname.endsWith(`.${WP_HOST}`);
    return url.protocol === "https:" && dominioOk ? url.toString() : null;
  } catch {
    return null;
  }
}

const postSchema = z.object({
  id: z.number(),
  date: z.string(),
  link: z.string(),
  title: z.object({ rendered: z.string() }),
  _embedded: z
    .object({
      "wp:featuredmedia": z.array(z.object({ source_url: z.string().optional() })).optional(),
    })
    .optional(),
});

/**
 * Busca os posts mais recentes do blog da Alfa para a seção
 * "Destaques da semana". Se a API do WordPress estiver bloqueada,
 * indisponível ou responder algo inesperado, falha silenciosamente
 * devolvendo uma lista vazia — a seção some da tela sem quebrar o portal.
 */
export async function buscarDestaquesSemana(): Promise<DestaquePost[]> {
  try {
    const res = await fetch(WP_ENDPOINT, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];

    const bruto = await res.json();
    if (!Array.isArray(bruto)) return [];

    const posts: DestaquePost[] = [];
    for (const item of bruto) {
      const post = postSchema.safeParse(item);
      if (!post.success) continue;

      const link = urlDoSiteDaAlfa(post.data.link);
      if (!link) continue; // sem link confiável, o post não entra

      posts.push({
        id: post.data.id,
        titulo: limparTitulo(post.data.title.rendered),
        data: post.data.date,
        link,
        imagem: urlDoSiteDaAlfa(post.data._embedded?.["wp:featuredmedia"]?.[0]?.source_url),
      });
    }
    return posts;
  } catch {
    // API bloqueada/instável: fallback silencioso, sem quebrar o portal.
    return [];
  }
}

const ENTIDADES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&nbsp;": " ",
};

/** O título é exibido como texto puro pelo React; aqui só tiramos tags e decodificamos as entidades comuns. */
function limparTitulo(valor: string): string {
  return valor
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&(amp|lt|gt|quot|nbsp|#039);/g, (m) => ENTIDADES[m] ?? m)
    .trim();
}
