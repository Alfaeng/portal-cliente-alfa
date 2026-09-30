"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/auth/admin-guard";
import { randomUUID } from "crypto";
import { z } from "zod";
import { slugify } from "@/lib/utils";
import { campo, idSchema, percentualSchema, primeiroErro } from "@/lib/validation";
import {
  TAMANHO_MAXIMO_FOTO,
  detectarTipoImagem,
  processarFoto,
} from "@/lib/media/processar-foto";
import { logErro } from "@/lib/logger";

// Etapas padrão de qualquer obra da Alfa — cadastradas automaticamente ao
// criar um empreendimento, com percentual inicial 0 (ficam ocultas para o
// cliente até o admin lançar algum avanço nelas).
const ETAPAS_PADRAO = [
  "Alvenarias",
  "Contrapiso",
  "Divisórias de gesso",
  "Esquadrias de alumínio e vidro",
  "Esquadrias de ferro",
  "Esquadrias de madeira",
  "Fachada",
  "Forro de gesso",
  "Pintura interna",
  "Louças e metais",
  "Paisagismo",
];

const TEXTO_ATUALIZACAO_PADRAO = "A obra segue em andamento, dentro do cronograma previsto.";

export interface ObraFormState {
  error?: string;
  success?: boolean;
}

const NIVEIS_OBRAS = ["editor_obras", "editor_completo", "administrador"] as const;

const novaObraSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do empreendimento.").max(120, "Nome muito longo."),
  bairro: z.string().trim().min(2, "Informe o bairro.").max(80, "Bairro muito longo."),
  avanco_geral: percentualSchema,
});

export async function criarEmpreendimento(
  _prevState: ObraFormState,
  formData: FormData
): Promise<ObraFormState> {
  await exigirAdmin([...NIVEIS_OBRAS]);
  const supabase = createSupabaseServerClient();

  const entrada = novaObraSchema.safeParse({
    nome: campo(formData, "nome"),
    bairro: campo(formData, "bairro"),
    avanco_geral: campo(formData, "avanco_geral") || 0,
  });
  if (!entrada.success) return { error: primeiroErro(entrada.error) };
  const { nome, bairro, avanco_geral: avancoGeral } = entrada.data;

  const slug = slugify(nome);
  if (!slug) return { error: "O nome precisa ter letras ou números." };

  const { data, error } = await supabase
    .from("empreendimentos")
    .insert({
      nome,
      bairro,
      slug,
      avanco_geral: avancoGeral,
      texto_atualizacao: TEXTO_ATUALIZACAO_PADRAO,
      atualizado_em: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Não foi possível cadastrar. Talvez já exista um empreendimento com esse nome." };
  }

  // Cadastra as etapas padrão (percentual 0) para o admin já poder editar
  // os percentuais, em vez de precisar criar etapa por etapa na mão.
  await supabase.from("empreendimento_etapas").insert(
    ETAPAS_PADRAO.map((nome_etapa, ordem) => ({
      empreendimento_id: data.id,
      nome: nome_etapa,
      percentual: 0,
      ordem,
    }))
  );

  revalidatePath("/admin/obras");
  redirect(`/admin/obras?edit=${data.id}`);
}

const atualizarObraSchema = z.object({
  id: idSchema,
  texto_atualizacao: z.string().max(2000, "O texto pode ter no máximo 2000 caracteres."),
  avanco_geral: percentualSchema,
});

export async function atualizarEmpreendimento(
  _prevState: ObraFormState,
  formData: FormData
): Promise<ObraFormState> {
  await exigirAdmin([...NIVEIS_OBRAS]);
  const supabase = createSupabaseServerClient();

  const entrada = atualizarObraSchema.safeParse({
    id: campo(formData, "id"),
    texto_atualizacao: campo(formData, "texto_atualizacao"),
    avanco_geral: campo(formData, "avanco_geral"),
  });
  if (!entrada.success) return { error: primeiroErro(entrada.error) };
  const { id, texto_atualizacao, avanco_geral } = entrada.data;

  // Percentual por etapa: campos nomeados etapa_<id>. Tudo é validado ANTES
  // de gravar qualquer coisa, para não salvar metade das alterações.
  const etapas: { id: string; percentual: number }[] = [];
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("etapa_")) continue;
    const etapaId = idSchema.safeParse(chave.slice("etapa_".length));
    const percentual = percentualSchema.safeParse(typeof valor === "string" ? valor : "");
    if (!etapaId.success || !percentual.success) {
      return { error: "Confira os percentuais das etapas: use números entre 0 e 100." };
    }
    etapas.push({ id: etapaId.data, percentual: percentual.data });
  }

  const { error } = await supabase
    .from("empreendimentos")
    .update({
      texto_atualizacao,
      avanco_geral,
      atualizado_em: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  let falhas = 0;
  for (const etapa of etapas) {
    // .eq("empreendimento_id") impede alterar etapa de OUTRO empreendimento.
    const { data: linhas, error: erroEtapa } = await supabase
      .from("empreendimento_etapas")
      .update({ percentual: etapa.percentual })
      .eq("id", etapa.id)
      .eq("empreendimento_id", id)
      .select("id");
    if (erroEtapa || !linhas || linhas.length === 0) {
      logErro("atualizarEmpreendimento: etapa não salva", etapa.id, erroEtapa?.message);
      falhas++;
    }
  }

  revalidatePath("/admin/obras");
  revalidatePath("/portal");

  if (falhas > 0) {
    return {
      error: `O texto e o avanço geral foram salvos, mas ${falhas} de ${etapas.length} etapas não. Tente de novo.`,
    };
  }
  return { success: true };
}

export async function excluirEmpreendimento(formData: FormData): Promise<void> {
  await exigirAdmin(["editor_completo", "administrador"]);
  const supabase = createSupabaseServerClient();

  const id = idSchema.safeParse(campo(formData, "id"));
  if (!id.success) return;

  // Remove os arquivos do storage antes de apagar o registro (etapas e
  // fotos no banco saem sozinhas via "on delete cascade").
  const { data: arquivos } = await supabase.storage.from("obras").list(id.data);
  if (arquivos && arquivos.length > 0) {
    await supabase.storage.from("obras").remove(arquivos.map((a) => `${id.data}/${a.name}`));
  }

  await supabase.from("empreendimentos").delete().eq("id", id.data);

  revalidatePath("/admin/obras");
  revalidatePath("/portal");
}

export async function excluirFoto(formData: FormData): Promise<void> {
  await exigirAdmin([...NIVEIS_OBRAS]);
  const supabase = createSupabaseServerClient();

  const fotoId = idSchema.safeParse(campo(formData, "foto_id"));
  if (!fotoId.success) return;

  // Soft-delete: some da galeria do cliente na hora, mas fica recuperável
  // por ~30 dias, igual ao que já acontece ao enviar fotos novas.
  await supabase.from("fotos").update({ deleted_at: new Date().toISOString() }).eq("id", fotoId.data);

  revalidatePath("/admin/obras");
  revalidatePath("/portal");
}

export interface EnvioFotoResultado {
  ok: boolean;
  id?: string;
  erro?: string;
}

/**
 * Recebe UMA foto por vez (o navegador envia uma a uma, o que evita estourar
 * o limite de tamanho da requisição). A foto é conferida pelo conteúdo real,
 * convertida (HEIC → JPEG), reduzida e limpa de metadados antes de ser salva.
 * As fotos antigas só saem do ar depois, em concluirLoteFotos.
 */
export async function enviarFoto(formData: FormData): Promise<EnvioFotoResultado> {
  await exigirAdmin([...NIVEIS_OBRAS]);
  const supabase = createSupabaseServerClient();

  const empreendimentoId = idSchema.safeParse(campo(formData, "empreendimento_id"));
  const arquivo = formData.get("foto");
  if (!empreendimentoId.success || !(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: "Selecione uma foto válida." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
    return { ok: false, erro: "A foto tem mais de 4 MB. Reduza o tamanho e tente de novo." };
  }

  const original = Buffer.from(await arquivo.arrayBuffer());
  const tipo = detectarTipoImagem(original);
  if (!tipo) {
    return { ok: false, erro: "Formato não aceito. Envie fotos JPEG, PNG, WebP ou HEIC." };
  }

  let processada: Buffer;
  try {
    processada = await processarFoto(original, tipo);
  } catch (err) {
    logErro("enviarFoto: falha ao processar a imagem", err);
    return { ok: false, erro: "Não foi possível ler esta imagem. Ela pode estar corrompida." };
  }

  const path = `${empreendimentoId.data}/${randomUUID()}.jpg`;
  const { error: erroUpload } = await supabase.storage
    .from("obras")
    .upload(path, processada, { contentType: "image/jpeg", upsert: false });
  if (erroUpload) {
    logErro("enviarFoto: falha no upload", erroUpload.message);
    return { ok: false, erro: "Não foi possível enviar esta foto. Tente de novo." };
  }

  const { data: publicUrl } = supabase.storage.from("obras").getPublicUrl(path);
  const { data: linha, error: erroInsert } = await supabase
    .from("fotos")
    .insert({ empreendimento_id: empreendimentoId.data, storage_path: path, url: publicUrl.publicUrl })
    .select("id")
    .single();
  if (erroInsert || !linha) {
    logErro("enviarFoto: falha ao registrar", erroInsert?.message);
    await supabase.storage.from("obras").remove([path]);
    return { ok: false, erro: "Não foi possível registrar esta foto. Tente de novo." };
  }

  return { ok: true, id: linha.id };
}

/**
 * Fecha o envio: as fotos que estavam no ar e NÃO fazem parte do lote novo
 * saem da galeria (soft-delete, recuperáveis por ~30 dias).
 */
export async function concluirLoteFotos(
  empreendimentoId: string,
  novosIds: string[]
): Promise<{ ok: boolean }> {
  await exigirAdmin([...NIVEIS_OBRAS]);
  const supabase = createSupabaseServerClient();

  const entrada = z
    .object({ empreendimentoId: idSchema, novosIds: z.array(idSchema).min(1).max(200) })
    .safeParse({ empreendimentoId, novosIds });
  if (!entrada.success) return { ok: false };

  const { error } = await supabase
    .from("fotos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("empreendimento_id", entrada.data.empreendimentoId)
    .is("deleted_at", null)
    .not("id", "in", `(${entrada.data.novosIds.join(",")})`);

  revalidatePath("/admin/obras");
  revalidatePath("/portal");
  return { ok: !error };
}
