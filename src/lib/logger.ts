/**
 * Log em uma linha de JSON (fácil de filtrar nos logs da Vercel) que remove
 * dados pessoais antes de escrever: CPF, e-mail e tokens viram [cpf], [email]
 * e [token]. Use no lugar de console.error/console.log.
 */
const SUBSTITUICOES: [RegExp, string][] = [
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf]"],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]"],
  [/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]"],
];

function limpar(valor: unknown): string {
  let texto: string;
  if (valor instanceof Error) texto = valor.message;
  else if (typeof valor === "string") texto = valor;
  else {
    try {
      texto = JSON.stringify(valor) ?? String(valor);
    } catch {
      texto = String(valor);
    }
  }
  for (const [padrao, troca] of SUBSTITUICOES) texto = texto.replace(padrao, troca);
  return texto.slice(0, 500);
}

function escrever(nivel: "erro" | "info", evento: string, detalhes: unknown[]) {
  const linha = JSON.stringify({
    nivel,
    evento: limpar(evento),
    detalhes: detalhes.map(limpar),
    em: new Date().toISOString(),
  });
  if (nivel === "erro") console.error(linha);
  else console.log(linha);
}

export function logErro(evento: string, ...detalhes: unknown[]) {
  escrever("erro", evento, detalhes);
}

export function logInfo(evento: string, ...detalhes: unknown[]) {
  escrever("info", evento, detalhes);
}
