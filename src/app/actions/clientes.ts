"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { exigirAdmin } from "@/lib/auth/admin-guard";
import { z } from "zod";
import { cpfValido, onlyDigits, slugify } from "@/lib/utils";
import { campo, emailSchema, idSchema, telefoneSchema } from "@/lib/validation";

const LIMITE_CSV_BYTES = 2 * 1024 * 1024;
const LIMITE_CSV_LINHAS = 10000;

function emailOuNulo(valor: string | undefined): string | null {
  const r = emailSchema.safeParse((valor ?? "").trim());
  return r.success ? r.data : null;
}

function telefoneOuNulo(valor: string | undefined): string | null {
  const r = telefoneSchema.safeParse((valor ?? "").trim());
  return r.success && r.data ? r.data : null;
}

export interface ImportState {
  error?: string;
  success?: boolean;
  importados?: number;
  ignorados?: number;
  vinculados?: number;
  obrasNaoEncontradas?: string[];
}

const initialState: ImportState = {};

export async function importarClientesCsv(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  const usuario = await exigirAdmin(["administrador"]);
  const supabase = createSupabaseServerClient();

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione o arquivo CSV exportado do Sienge." };
  }

  if (arquivo.size > LIMITE_CSV_BYTES) {
    return { error: "O arquivo passa de 2 MB. Divida a planilha em partes menores." };
  }

  const texto = await arquivo.text();
  const { data } = Papa.parse<Record<string, string>>(texto, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  // Mapa para achar o empreendimento pelo slug ou pelo nome (sem acento).
  const { data: obras } = await supabase.from("empreendimentos").select("id, slug, nome");
  const obraPorChave = new Map<string, string>();
  for (const obra of obras ?? []) {
    obraPorChave.set(obra.slug, obra.id);
    obraPorChave.set(slugify(obra.nome), obra.id);
  }

  if (data.length > LIMITE_CSV_LINHAS) {
    return { error: `A planilha tem mais de ${LIMITE_CSV_LINHAS} linhas. Divida em partes menores.` };
  }

  const linhasValidas: { cpf: string; nome: string; email: string | null; telefone: string | null }[] = [];
  const obrasDoCpf = new Map<string, Set<string>>();
  const naoEncontradas = new Set<string>();
  let ignorados = 0;

  for (const linha of data) {
    const cpf = onlyDigits(linha.cpf ?? "");
    const nome = (linha.nome ?? "").trim();
    if (!cpfValido(cpf) || !nome || nome.length > 120) {
      ignorados += 1;
      continue;
    }
    linhasValidas.push({
      cpf,
      nome,
      email: emailOuNulo(linha.email),
      telefone: telefoneOuNulo(linha.telefone),
    });

    // Coluna opcional "empreendimento": um ou mais, separados por ; ou |
    for (const nomeObra of (linha.empreendimento ?? "").split(/[;|]/)) {
      const chave = slugify(nomeObra);
      if (!chave) continue;
      const obraId = obraPorChave.get(chave);
      if (!obraId) {
        naoEncontradas.add(nomeObra.trim());
        continue;
      }
      if (!obrasDoCpf.has(cpf)) obrasDoCpf.set(cpf, new Set());
      obrasDoCpf.get(cpf)!.add(obraId);
    }
  }

  if (linhasValidas.length === 0) {
    return { error: "Nenhuma linha válida encontrada. Confira as colunas: cpf, nome, email, telefone." };
  }

  // O banco guarda só o código (hash) do CPF; o número em si não é gravado.
  // A função devolve, para cada linha enviada (ordem 1, 2, 3…), o id do cliente.
  const admin = createSupabaseAdminClient();
  const { data: salvos, error } = await admin.rpc("importar_clientes", {
    p_admin: usuario.id,
    p_linhas: linhasValidas,
  });

  if (error) {
    console.error("importarClientesCsv", error.message);
    return { error: "Erro ao importar. Verifique o formato do arquivo e tente novamente." };
  }

  // Só ADICIONA vínculos (nunca remove): tirar o acesso de alguém é uma
  // decisão manual, feita na edição do cliente.
  const novosVinculos = ((salvos ?? []) as { ordem: number; id: string }[]).flatMap((linha) => {
    const cpf = linhasValidas[linha.ordem - 1]?.cpf;
    return [...(cpf ? obrasDoCpf.get(cpf) ?? [] : [])].map((empreendimento_id) => ({
      cliente_id: linha.id,
      empreendimento_id,
    }));
  });
  if (novosVinculos.length > 0) {
    const { error: erroVinculos } = await supabase
      .from("cliente_empreendimentos")
      .upsert(novosVinculos, { onConflict: "cliente_id,empreendimento_id", ignoreDuplicates: true });
    if (erroVinculos) {
      return { error: "Clientes importados, mas não foi possível vincular os empreendimentos. Vincule pela edição do cliente." };
    }
  }

  revalidatePath("/admin/clientes");
  revalidatePath("/portal");
  return {
    success: true,
    importados: linhasValidas.length,
    ignorados,
    vinculados: novosVinculos.length,
    obrasNaoEncontradas: [...naoEncontradas],
  };
}

export interface CriarClienteState {
  error?: string;
  success?: boolean;
}

// Cadastro manual de um único cliente, sem precisar montar/subir CSV.
export async function criarClienteManual(
  _prevState: CriarClienteState,
  formData: FormData
): Promise<CriarClienteState> {
  const usuario = await exigirAdmin(["administrador"]);

  const cpf = onlyDigits(campo(formData, "cpf"));
  const nome = campo(formData, "nome").trim();
  const emailBruto = campo(formData, "email").trim();
  const telefoneBruto = campo(formData, "telefone").trim();

  if (!cpfValido(cpf)) return { error: "CPF inválido. Confira os números digitados." };
  if (!nome) return { error: "Digite o nome do cliente." };
  if (nome.length > 120) return { error: "O nome pode ter no máximo 120 caracteres." };
  if (emailBruto && !emailSchema.safeParse(emailBruto).success) return { error: "E-mail inválido." };
  if (telefoneBruto && !telefoneSchema.safeParse(telefoneBruto).success) {
    return { error: "Telefone inválido. Use só números, espaço, ( ) + e -." };
  }
  const email = emailBruto ? emailSchema.parse(emailBruto) : "";
  const telefone = telefoneBruto;

  // O banco guarda só o código (hash) e a versão mascarada do CPF.
  const { error } = await createSupabaseAdminClient().rpc("criar_cliente", {
    p_admin: usuario.id,
    p_cpf: cpf,
    p_nome: nome,
    p_email: email,
    p_telefone: telefone,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um cliente cadastrado com esse CPF." };
    }
    return { error: "Não foi possível cadastrar o cliente." };
  }

  revalidatePath("/admin/clientes");
  return { success: true };
}

// Edição de um cliente já cadastrado (nome, e-mail, telefone). O CPF não
// é editável aqui — é a chave usada no login do cliente e na importação.
export async function atualizarCliente(id: string, nome: string, email: string, telefone: string) {
  await exigirAdmin(["administrador"]);
  const supabase = createSupabaseServerClient();

  const nomeLimpo = nome.trim();
  if (!idSchema.safeParse(id).success || !nomeLimpo || nomeLimpo.length > 120) return;

  await supabase
    .from("clientes")
    .update({
      nome: nomeLimpo,
      email: emailOuNulo(email),
      telefone: telefoneOuNulo(telefone),
    })
    .eq("id", id);

  revalidatePath("/admin/clientes");
}

export interface ExcluirClienteState {
  error?: string;
}

// Exclusão de um cliente (eliminação de dados, LGPD art. 18). As respostas de
// pesquisa dele continuam no histórico, mas sem identificação (o vínculo com o
// cliente vira nulo). Os vínculos com empreendimentos e os aceites da política
// saem junto.
export async function excluirCliente(id: string): Promise<ExcluirClienteState> {
  await exigirAdmin(["administrador"]);
  const supabase = createSupabaseServerClient();

  if (!idSchema.safeParse(id).success) return {};

  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Não foi possível excluir: este cliente já tem respostas de pesquisa registradas no histórico.",
      };
    }
    return { error: "Não foi possível excluir o cliente." };
  }

  revalidatePath("/admin/clientes");
  return {};
}

const vinculosSchema = z.object({
  clienteId: z.string().uuid(),
  empreendimentoIds: z.array(z.string().uuid()).max(100),
});

export interface VinculosState {
  error?: string;
}

// Define exatamente quais empreendimentos o cliente pode ver. Remove os que
// foram desmarcados e adiciona os novos.
export async function atualizarVinculosCliente(
  clienteId: string,
  empreendimentoIds: string[]
): Promise<VinculosState> {
  await exigirAdmin(["administrador"]);

  const entrada = vinculosSchema.safeParse({ clienteId, empreendimentoIds });
  if (!entrada.success) return { error: "Dados inválidos." };

  const supabase = createSupabaseServerClient();
  const ids = [...new Set(entrada.data.empreendimentoIds)];

  const remocao = supabase.from("cliente_empreendimentos").delete().eq("cliente_id", clienteId);
  const { error: erroRemocao } = ids.length
    ? await remocao.not("empreendimento_id", "in", `(${ids.join(",")})`)
    : await remocao;
  if (erroRemocao) return { error: "Não foi possível salvar os empreendimentos do cliente." };

  if (ids.length > 0) {
    const { error } = await supabase
      .from("cliente_empreendimentos")
      .upsert(
        ids.map((empreendimento_id) => ({ cliente_id: clienteId, empreendimento_id })),
        { onConflict: "cliente_id,empreendimento_id", ignoreDuplicates: true }
      );
    if (error) return { error: "Não foi possível salvar os empreendimentos do cliente." };
  }

  revalidatePath("/admin/clientes");
  revalidatePath("/portal");
  return {};
}
