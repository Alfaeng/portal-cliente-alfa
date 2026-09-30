"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/auth/admin-guard";
import { slugify } from "@/lib/utils";

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

export async function criarEmpreendimento(
  _prevState: ObraFormState,
  formData: FormData
): Promise<ObraFormState> {
  await exigirAdmin(["editor_obras", "editor_completo", "administrador"]);
  const supabase = createSupabaseServerClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const bairro = String(formData.get("bairro") ?? "").trim();
  const avancoGeral = Number(formData.get("avanco_geral") ?? 0);

  if (!nome || !bairro) {
    return { error: "Preencha nome e bairro do empreendimento." };
  }

  const slug = slugify(nome);

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

export async function atualizarEmpreendimento(
  _prevState: ObraFormState,
  formData: FormData
): Promise<ObraFormState> {
  await exigirAdmin(["editor_obras", "editor_completo", "administrador"]);
  const supabase = createSupabaseServerClient();

  const id = String(formData.get("id") ?? "");
  const texto = String(formData.get("texto_atualizacao") ?? "");
  const avancoGeral = Number(formData.get("avanco_geral") ?? 0);

  if (!id) return { error: "Empreendimento inválido." };

  const { error } = await supabase
    .from("empreendimentos")
    .update({
      texto_atualizacao: texto,
      avanco_geral: avancoGeral,
      atualizado_em: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  // Percentual por etapa: campos nomeados etapa_<id>
  let falhaEtapa: string | null = null;
  let etapasAtualizadas = 0;
  let etapasTentadas = 0;

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("etapa_")) {
      etapasTentadas++;
      const etapaId = key.replace("etapa_", "");
      const percentual = Number(value);
      const { data: linhasAtualizadas, error: etapaError } = await supabase
        .from("empreendimento_etapas")
        .update({ percentual })
        .eq("id", etapaId)
        .select("id");

      if (etapaError) {
        if (!falhaEtapa) falhaEtapa = etapaError.message;
      } else if (!linhasAtualizadas || linhasAtualizadas.length === 0) {
        if (!falhaEtapa) falhaEtapa = `etapa ${etapaId} não encontrada (0 linhas afetadas)`;
      } else {
        etapasAtualizadas++;
      }
    }
  }

  revalidatePath("/admin/obras");
  revalidatePath("/portal");

  if (falhaEtapa) {
    return {
      error: `Salvo o texto e o avanço geral, mas ${etapasTentadas - etapasAtualizadas} de ${etapasTentadas} etapas não foram salvas. Detalhe: ${falhaEtapa}.`,
    };
  }
  return { success: true };
}

export async function excluirEmpreendimento(formData: FormData): Promise<void> {
  await exigirAdmin(["editor_completo", "administrador"]);
  const supabase = createSupabaseServerClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Remove os arquivos do storage antes de apagar o registro (etapas e
  // fotos no banco saem sozinhas via "on delete cascade").
  const { data: arquivos } = await supabase.storage.from("obras").list(id);
  if (arquivos && arquivos.length > 0) {
    await supabase.storage.from("obras").remove(arquivos.map((a) => `${id}/${a.name}`));
  }

  await supabase.from("empreendimentos").delete().eq("id", id);

  revalidatePath("/admin/obras");
  revalidatePath("/portal");
}

export async function excluirFoto(formData: FormData): Promise<void> {
  await exigirAdmin(["editor_obras", "editor_completo", "administrador"]);
  const supabase = createSupabaseServerClient();

  const fotoId = String(formData.get("foto_id") ?? "");
  if (!fotoId) return;

  // Soft-delete: some da galeria do cliente na hora, mas fica recuperável
  // por ~30 dias, igual ao que já acontece ao enviar fotos novas.
  await supabase.from("fotos").update({ deleted_at: new Date().toISOString() }).eq("id", fotoId);

  revalidatePath("/admin/obras");
  revalidatePath("/portal");
}

export async function enviarFotos(
  _prevState: ObraFormState,
  formData: FormData
): Promise<ObraFormState> {
  await exigirAdmin(["editor_obras", "editor_completo", "administrador"]);
  const supabase = createSupabaseServerClient();

  const empreendimentoId = String(formData.get("empreendimento_id") ?? "");
  const arquivos = formData.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);

  if (!empreendimentoId || arquivos.length === 0) {
    return { error: "Selecione ao menos uma foto." };
  }

  // Soft-delete das fotos atuais (ficam recuperáveis por ~30 dias).
  await supabase
    .from("fotos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("empreendimento_id", empreendimentoId)
    .is("deleted_at", null);

  let enviadas = 0;
  let primeiroErro: string | null = null;

  for (const arquivo of arquivos) {
    const path = `${empreendimentoId}/${Date.now()}-${arquivo.name}`;
    const { error: uploadError } = await supabase.storage.from("obras").upload(path, arquivo, {
      contentType: arquivo.type,
      upsert: false,
    });
    if (uploadError) {
      if (!primeiroErro) primeiroErro = uploadError.message;
      continue;
    }

    const { data: publicUrl } = supabase.storage.from("obras").getPublicUrl(path);
    const { error: insertError } = await supabase.from("fotos").insert({
      empreendimento_id: empreendimentoId,
      storage_path: path,
      url: publicUrl.publicUrl,
    });
    if (insertError) {
      if (!primeiroErro) primeiroErro = insertError.message;
      continue;
    }
    enviadas++;
  }

  revalidatePath("/admin/obras");
  revalidatePath("/portal");

  if (enviadas === 0) {
    return { error: `Não foi possível enviar as fotos. Detalhe: ${primeiroErro ?? "erro desconhecido"}.` };
  }
  if (enviadas < arquivos.length) {
    return { error: `${arquivos.length - enviadas} de ${arquivos.length} fotos falharam (${primeiroErro}). As demais foram enviadas.`, success: true };
  }
  return { success: true };
}
