"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/auth/admin-guard";
import { campo, idSchema } from "@/lib/validation";

export interface PesquisaFormState {
  error?: string;
  success?: boolean;
}

const initialState: PesquisaFormState = {};

async function pausarTodasAtivas(supabase: ReturnType<typeof createSupabaseServerClient>) {
  await supabase
    .from("campanhas_pesquisa")
    .update({ status: "pausada", updated_at: new Date().toISOString() })
    .eq("status", "ativa");
}

export async function publicarPergunta(
  _prevState: PesquisaFormState,
  formData: FormData
): Promise<PesquisaFormState> {
  const usuario = await exigirAdmin(["editor_completo", "administrador"]);
  const supabase = createSupabaseServerClient();

  const pergunta = campo(formData, "pergunta").trim();
  if (pergunta.length < 5) return { error: "Escreva a pergunta da pesquisa (mínimo de 5 caracteres)." };
  if (pergunta.length > 200) return { error: "A pergunta pode ter no máximo 200 caracteres." };

  await pausarTodasAtivas(supabase);

  const { error } = await supabase.from("campanhas_pesquisa").insert({
    pergunta,
    status: "ativa",
    periodo_inicio: new Date().toISOString().slice(0, 10),
    created_by: usuario.id,
  });

  if (error) return { error: "Não foi possível publicar a pergunta." };

  revalidatePath("/admin/pesquisa");
  revalidatePath("/portal");
  return { success: true };
}

export async function pausarCampanha(id: string) {
  await exigirAdmin(["editor_completo", "administrador"]);
  if (!idSchema.safeParse(id).success) return;
  const supabase = createSupabaseServerClient();

  await supabase
    .from("campanhas_pesquisa")
    .update({
      status: "pausada",
      periodo_fim: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/pesquisa");
  revalidatePath("/portal");
}

export async function reativarCampanha(id: string) {
  await exigirAdmin(["editor_completo", "administrador"]);
  if (!idSchema.safeParse(id).success) return;
  const supabase = createSupabaseServerClient();

  await pausarTodasAtivas(supabase);

  await supabase
    .from("campanhas_pesquisa")
    .update({ status: "ativa", periodo_fim: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/pesquisa");
  revalidatePath("/portal");
}

// Ocultar tira a campanha da lista principal (fica em "standby"), sem
// apagar nada — só uma campanha já pausada pode ser ocultada.
export async function ocultarCampanha(id: string) {
  await exigirAdmin(["editor_completo", "administrador"]);
  if (!idSchema.safeParse(id).success) return;
  const supabase = createSupabaseServerClient();

  await supabase
    .from("campanhas_pesquisa")
    .update({ oculta: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pausada");

  revalidatePath("/admin/pesquisa");
}

// Reexibir traz a campanha de volta para a lista principal, onde dá para
// reativar ou exportar normalmente.
export async function reexibirCampanha(id: string) {
  await exigirAdmin(["editor_completo", "administrador"]);
  if (!idSchema.safeParse(id).success) return;
  const supabase = createSupabaseServerClient();

  await supabase
    .from("campanhas_pesquisa")
    .update({ oculta: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/pesquisa");
}

// Exclusão permanente: apaga a campanha e (via cascade) todas as
// respostas do histórico. A confirmação acontece no botão, antes de
// chamar esta action.
export async function excluirCampanha(formData: FormData): Promise<void> {
  await exigirAdmin(["editor_completo", "administrador"]);
  const supabase = createSupabaseServerClient();

  const parsed = idSchema.safeParse(campo(formData, "id"));
  if (!parsed.success) return;
  const id = parsed.data;

  await supabase.from("campanhas_pesquisa").delete().eq("id", id);

  revalidatePath("/admin/pesquisa");
}

// Zera só as respostas de uma campanha (ex.: limpar testes antes de
// liberar o link de verdade), mantendo a pergunta e o quadro no ar.
export async function limparRespostasCampanha(formData: FormData): Promise<void> {
  await exigirAdmin(["editor_completo", "administrador"]);
  const supabase = createSupabaseServerClient();

  const parsed = idSchema.safeParse(campo(formData, "id"));
  if (!parsed.success) return;
  const id = parsed.data;

  await supabase.from("respostas_pesquisa").delete().eq("campanha_id", id);

  revalidatePath("/admin/pesquisa");
  revalidatePath("/portal");
}
