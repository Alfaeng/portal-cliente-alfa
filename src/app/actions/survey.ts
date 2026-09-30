"use server";

import { cookies } from "next/headers";
import { CLIENTE_SESSION_COOKIE, lerSessaoCliente } from "@/lib/auth/cliente-session";
import { registrarResposta } from "@/lib/data/pesquisa";

export async function responderPesquisa(campanhaId: string, nota: number) {
  const token = (await cookies()).get(CLIENTE_SESSION_COOKIE)?.value;
  const sessao = await lerSessaoCliente(token);
  if (!sessao) return { ok: false, jaRespondeu: false };

  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return { ok: false, jaRespondeu: false };

  const resultado = await registrarResposta(campanhaId, nota, sessao.clienteId);
  return { ok: resultado === "ok", jaRespondeu: resultado === "ja_respondeu" };
}
