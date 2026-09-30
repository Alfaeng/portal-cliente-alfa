/**
 * Evita "injeção de fórmula" em planilhas: um texto que começa com = + - @
 * (ou tab/quebra de linha) pode ser executado como fórmula quando o arquivo
 * é aberto no Excel. Prefixar com apóstrofo faz o Excel tratá-lo como texto.
 */
export function neutralizarFormula(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}
