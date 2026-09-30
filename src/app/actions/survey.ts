"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { CLIENTE_SESSION_COOKIE, lerSessaoCliente } from "@/lib/auth/cliente-session";
import { registrarResposta } from "@/lib/data/pesquisa";

const respostaSchema = z.object({
  campanhaId: z.string().uuid(),
  nota: z.number().int().min(1).max(5),
});

export async function responderPesquisa(campanhaId: string, nota: number) {
  const token = (await cookies()).get(CLIENTE_SESSION_COOKIE)?.value;
  const sessao = await lerSessaoCliente(token);
  if (!sessao) return { ok: false, jaRespondeu: false };

  const entrada = respostaSchema.safeParse({ campanhaId, nota });
  if (!entrada.success) return { ok: false, jaRespondeu: false };

  const resultado = await registrarResposta(entrada.data.campanhaId, entrada.data.nota, sessao.clienteId);
  return { ok: resultado === "ok", jaRespondeu: resultado === "ja_respondeu" };
}
