import { z } from "zod";

/** Regras de validação compartilhadas pelas Server Actions. */

export const idSchema = z.string().uuid();

/** Percentual de 0 a 100. Rejeita texto, vazio e NaN. */
export const percentualSchema = z.coerce
  .number({ invalid_type_error: "Informe um número entre 0 e 100." })
  .finite("Informe um número entre 0 e 100.")
  .min(0, "O percentual não pode ser negativo.")
  .max(100, "O percentual não pode passar de 100.");

export const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido.").max(254);

export const telefoneSchema = z
  .string()
  .trim()
  .max(20, "Telefone muito longo.")
  .regex(/^[0-9 ()+\-]*$/, "Telefone só pode ter números, espaço, ( ) + e -.");

export function primeiroErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}

/** Lê um campo de FormData como texto (nulo vira vazio). */
export function campo(formData: FormData, nome: string): string {
  const valor = formData.get(nome);
  return typeof valor === "string" ? valor : "";
}
