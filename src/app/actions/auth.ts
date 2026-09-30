"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CLIENTE_SESSION_COOKIE,
  CLIENTE_SESSION_MAX_AGE,
  criarTokenSessaoCliente,
} from "@/lib/auth/cliente-session";
import { dentroDoLimite, hashParaChave, ipDaRequisicao } from "@/lib/security/rate-limit";
import { cpfValido, onlyDigits } from "@/lib/utils";
import { logErro } from "@/lib/logger";

export interface LoginState {
  error?: string;
}

// Mesma mensagem para "CPF não existe" e "CPF inativo": quem tenta descobrir
// quais CPFs são clientes da Alfa não consegue diferenciar os casos.
const MENSAGEM_NAO_ENCONTRADO =
  "Não foi possível entrar com esse CPF. Verifique os números ou fale com a Alfa.";
const MENSAGEM_MUITAS_TENTATIVAS =
  "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";

const JANELA_LOGIN_SEGUNDOS = 15 * 60;
const LIMITE_POR_CPF = 5;
const LIMITE_POR_IP = 20;

async function buscarClientePorCpf(cpf: string): Promise<{ id: string; nome: string } | null> {
  try {
    // O banco compara o CPF com o código (hash) guardado; o número em si não é gravado.
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("buscar_cliente_por_cpf", { p_cpf: cpf });

    if (error) {
      logErro("login cliente: erro ao consultar clientes", error.message);
      return null;
    }
    const cliente = Array.isArray(data) ? data[0] : null;
    if (!cliente || !cliente.ativo) return null;
    return { id: cliente.id, nome: cliente.nome };
  } catch (err) {
    logErro("login cliente: falha inesperada", err);
    return null;
  }
}

export async function loginComCpf(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const cpf = onlyDigits(String(formData.get("cpf") ?? ""));

  if (!cpfValido(cpf)) {
    return { error: "CPF inválido. Confira os números digitados." };
  }

  // Limite de tentativas: por IP (quem varre vários CPFs) e por CPF (quem
  // insiste em um CPF só). A chave do CPF é um hash, nunca o número em si.
  const [okIp, okCpf] = await Promise.all([
    dentroDoLimite(`login_cliente_ip:${(await ipDaRequisicao())}`, LIMITE_POR_IP, JANELA_LOGIN_SEGUNDOS),
    dentroDoLimite(`login_cliente_cpf:${hashParaChave(cpf)}`, LIMITE_POR_CPF, JANELA_LOGIN_SEGUNDOS),
  ]);
  if (!okIp || !okCpf) {
    return { error: MENSAGEM_MUITAS_TENTATIVAS };
  }

  const cliente = await buscarClientePorCpf(cpf);
  if (!cliente) {
    return { error: MENSAGEM_NAO_ENCONTRADO };
  }

  const token = await criarTokenSessaoCliente({ clienteId: cliente.id, nome: cliente.nome });

  (await cookies()).set(CLIENTE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CLIENTE_SESSION_MAX_AGE,
  });

  redirect("/portal");
}

export async function logoutCliente() {
  (await cookies()).delete(CLIENTE_SESSION_COOKIE);
  redirect("/");
}
